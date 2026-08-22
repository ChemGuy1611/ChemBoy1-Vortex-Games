# BepInEx Bleeding Edge Builds

`builds.bepinex.dev` publishes the continuous-integration builds of BepInEx 6 ("bleeding edge", BE). IL2CPP Unity games need these builds: BepInEx's stable GitHub releases are the 5.x mono line, and 6.x has never had a stable release, so `builds.bepinex.dev` is the only source for an IL2CPP-capable BepInEx.

There is **no API of any kind**. The project's build index page is the only machine-readable surface:

| Surface | URL | Purpose |
| --- | --- | --- |
| Build index page | `https://builds.bepinex.dev/projects/bepinex_be` | Every build, newest first, with its artifact links |
| Artifact | `https://builds.bepinex.dev/projects/bepinex_be/{build}/{artifactName}` | The build's downloadable zip |

Probed live: `/api/projects/bepinex_be` returns `404`, and there is no `/latest` alias (also `404`). Discovery therefore means parsing the index page.

## The Build Index Page

`GET https://builds.bepinex.dev/projects/bepinex_be`

Roughly 560 KB of HTML, about 31 KB over the wire — the host serves gzip, which any `fetch` negotiates automatically. That is cheap enough for a per-update-check request. It currently carries 145 builds, `#785` down to `#510`.

Builds appear newest-first, one `artifact-item` block each:

```html
<div class="artifact-item">
    <div class="artifact-details">
        <span class="artifact-id">#785</span>
        <a class="hash-button" href="https://github.com/BepInEx/BepInEx/commit/6abdba47...">6abdba4</a>
        <span class="build-date-text">Build date: <span class="build-date">2026-06-28T16:09:22.2426304+00:00</span></span>
    </div>
    <div class="artifact-contents content">
        <div class="artifacts-list">
            <a class="artifact-link"
                            href="/projects/bepinex_be/785/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.785%2B6abdba4.zip">BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.785+6abdba4.zip</a>
            <span class="artifact-desc">BepInEx Unity (IL2CPP) for Windows (x64) games</span>
```

Three details a parser has to get right:

- **`class="artifact-link"` and its `href` sit on separate lines**, with indentation between them. A pattern matching the anchor has to span that newline — `<a class="artifact-link"[\s\S]*?href="([^"]+)"[^>]*>([^<]+)</a>` — rather than assuming they are adjacent.
- **The `href` is already percent-encoded.** The `+` that separates build from commit arrives as `%2B`. Resolve the leading slash against the origin (`new URL(href, 'https://builds.bepinex.dev')`) but do not re-encode the result; encoding the `%` produces a `404`.
- **Match the link text, not the href.** The href starts with `/projects/bepinex_be/785/`, so an anchored pattern like `/^BepInEx-Unity\.IL2CPP-win-x64-/` only works against the artifact's displayed file name.

## Builds Are Not Versions

Every build reports the same product version. `BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.785+6abdba4.zip` and its build-660 counterpart both coerce to `6.0.0` under semver, so version comparison cannot distinguish them at all.

The **build number** is the only ordering key. It is a sequential integer, so update detection is a numeric compare (`785 > 755`) and no semver dependency is involved. The commit hash identifies the source revision but does not order anything.

## Artifact Naming Changed at Build 647

Two naming schemes appear on the index page, and a pattern written for one does not match the other:

| Builds | Scheme | Example |
| --- | --- | --- |
| 647 and newer | `BepInEx-{Runtime}-{platform}-{arch}-6.0.0-be.{build}+{commit}.zip` | `BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.785+6abdba4.zip` |
| 577 and older | `BepInEx_{Runtime}_{arch}_{commit}_6.0.0-be.{build}.zip` | `BepInEx_UnityIL2CPP_x64_e66c15b_6.0.0-be.520.zip` |

The index page has no builds between 578 and 646. The artifact set has also grown: the oldest builds ship 6 artifacts, builds 647-674 ship 11, and current builds ship 13 (the .NET Framework and CoreCLR targets each split into two).

Practical effect: a pattern like `/^BepInEx-Unity\.IL2CPP-win-x64-/i` matches every build from 647 up and **nothing** below it. That is the right behavior for tracking the newest build, and it only becomes a constraint when pinning to a build older than 647 — which needs either a matching legacy pattern or an explicit artifact URL.

## Downloading

Artifact URLs serve the file directly. Verified headless against build 785's IL2CPP win-x64 artifact:

```text
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Length: 34335572
Accept-Ranges: bytes
Server: cloudflare
```

Cloudflare fronts the host but does **not** bot-block it — a plain `curl` gets the file. Unlike ModDB (see `MODDB_API.md`), no mirror-resolution step and no direct-fetch fallback route are needed: the artifact URL can be handed straight to Vortex's download manager. `Accept-Ranges: bytes` means chunked/resumable downloads work.

## Shared bepinexbe_downloader.js Module

`resources/downloader/bepinexbe_downloader.js` packages the above into a reusable requirements auto-downloader — the builds.bepinex.dev counterpart to the GitHub `downloader.js` and the GameBanana/ModDB/ModWorkshop/Thunderstore companions (see `DOWNLOADER.md`). It resolves the newest build carrying the requirement's artifact, downloads and installs it, and raises an "update available" notification when a newer build appears.

As with the other downloader modules, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_bepinexbe_downloader.js`.

Only IL2CPP games need it. A mono Unity game gets BepInEx 5.x from the project's GitHub releases through the ordinary `downloader.js`, so it should not carry a copy of this module at all.

### The requirement object

The entry points take an array of requirement objects (conventionally a `BEPINEX_BE_REQUIREMENTS` constant in `index.js`), each describing one builds.bepinex.dev requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `artifactPattern` | yes | RegExp tested against artifact **file names**, e.g. `/^BepInEx-Unity\.IL2CPP-win-x64-/i`. Do not set the `g` flag — a stateful RegExp would match on alternating calls. |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications, on the download, and in the mod list (stamped as the mod's `customFileName`). |
| `fallbackBuild` | optional | Build number recorded when the index page is unreachable. |
| `fallbackArtifactUrl` | optional | Artifact URL used when the index page is unreachable. Without it, an unreachable index fails the install with a manual-download error. |
| `projectPath` | optional | Project whose index is parsed, relative to `https://builds.bepinex.dev`. Default `'projects/bepinex_be'`. |
| `buildAttribute` | optional | Mod attribute tracking the installed build number for update checks. Default `'bepinexBeBuild'`. |
| `pageUrl` | optional | Manual-download page opened on install failure, and the mod's "Source" link. Default derived from `projectPath`. |
| `autoInstall` | optional | `false` -> never install this requirement unattended; only an explicit user action (a toolbar button, or a loader-choice dialog) installs it. Default installs a missing requirement automatically when the update check runs. |
| `pinVersion` | optional | Hold the requirement at this build instead of tracking the newest one. See **Version pinning** below. |
| `pinArtifactUrl` | with an off-index `pinVersion` | Artifact URL for the pinned build. Only needed once that build has scrolled off the index page. |

There is no `assemblyFileName` field. Installed-detection here is purely by mod type, as in the other non-GitHub companions; `downloader.js` reads that field only through the extension's own `findMod` closure.

### Version pinning

`pinVersion` holds the requirement at one build instead of following the newest one. It is opt-in and unset by default. While the tracked `bepinexBeBuild` equals `pinVersion`, `checkForBepinexBeUpdate` returns **before making any request** — a pinned requirement never fetches the index page.

Unlike the file-id based companions, no second field is required: the index lists every build that has not scrolled off it, so the pinned build is found by number. `pinArtifactUrl` exists for the case where it has, and short-circuits the index fetch on install as well.

When the installed build is not the pinned one — including when nothing is installed — the module resolves the *pinned* build, never the newest. If that build cannot be resolved (scrolled off the index, or carrying no artifact matching `artifactPattern` — see the naming change at 647), the install fails with a message pointing at `pinArtifactUrl` rather than silently installing the newest build in its place. The notification reads "pinned version available" rather than "update available", because the user may be *ahead* of the pin and installing it is then a deliberate downgrade. `autoInstall` stays orthogonal: the pin says which build, `autoInstall` says whether anything installs unattended.

The same field name and behavior exist in six of the seven downloader modules — the fcmodding.com one has no pin at all, because its host culls old builds; `DOWNLOADER.md` has the cross-module table.

### Exports

| Export | Role |
| --- | --- |
| `downloadBepinexBe(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially), then enable it, set its mod type, and record version + build attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point. |
| `checkForBepinexBeUpdate(api, gameSpec, requirements)` | For each requirement in the array: install it if it is missing (unless `autoInstall: false`), otherwise compare the tracked build against the newest one on the index; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler. |
| `downloadBepinexBeRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadBepinexBe`. |
| `checkForBepinexBeUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForBepinexBeUpdate`. |
| `isBepinexBeInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestBepinexBeBuild(requirement)` | Newest build carrying a matching artifact, as `{ build, commit, date, artifact: { name, url } }`, or `null` if the index is unreachable or nothing matches. |
| `getBepinexBeBuild(requirement, buildNumber)` | The same shape for one specific build, or `null` if it is not on the index or carries no matching artifact. |
| `parseBepinexBeArtifacts(html)` | The index-page parser: HTML in, `[{ build, commit, date, artifacts: [{ name, url }] }]` newest-first out. Exported for testing and for callers that want the whole list. |

### Behaviors worth knowing

- **Builds without a matching artifact are skipped, not fatal.** `getLatestBepinexBeBuild` walks the index newest-first and returns the first build whose artifact set matches the pattern. A build that failed to produce a given target does not stall every game behind it.
- **No already-downloaded shortcut.** The GitHub module skips the API when the exact archive is already in the Downloads folder. That shortcut is deliberately absent here: the artifact filename embeds the build and commit, so a stale local archive is exactly what must not be reused.
- **Numeric build compare.** Update detection compares the `bepinexBeBuild` attribute numerically against the parsed build. A copy installed before build tracking existed has no attribute, so it draws one notification and the resulting install stamps it — self-healing.
- **The mod list shows `userFacingName`, not the artifact name.** Vortex renders a mod as `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps `fileName` with the downloaded archive — so the install also stamps `customFileName` from `userFacingName`. Without it the mod list reads `BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.785+6abdba4.zip`. Written at install only, so it cannot overwrite a name the user set afterwards. Rendering rule: `VORTEX_MOD_LIST.md`.
- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to the build index page — Vortex renders this as a clickable "Source" link in the mod details panel.
- **Index-unreachable fallback.** The installer falls back to `fallbackArtifactUrl`/`fallbackBuild`; the update check silently skips (nothing to compare against).
- **No silent auto-update.** The update check only notifies; the user-driven Download action performs the update.
- **Updating disables the build it replaces.** An update installs a second mod entry rather than replacing the first, so the mod ids carrying the requirement's mod type are captured before the install and disabled once the download succeeds. The disable is dispatched immediately rather than batched at the end — the install enables the incoming mod as soon as it lands, so a deferred disable would leave both enabled (or, if Vortex reuses the mod id, land on the copy just installed). It runs after the download rather than before it, so a failed download leaves the working build enabled.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked toolbar action), keyed by mod type.
- **Install failure opens the index page.** A failed download/install shows an error notification and opens the build index for a manual download.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.

## Caveats

- No API and no `/latest` alias — the index page is the whole contract, and its markup is not versioned by the project. Treat the block/anchor patterns as fragile and keep `fallbackArtifactUrl` set.
- The index page is a rolling window. Old builds scroll off it, which is what `pinArtifactUrl` exists for.
- Bleeding-edge builds are CI output, not releases. There are no release notes and no stability guarantee; a newer build can regress. That is the case `pinVersion` covers.
- Mono Unity games should use BepInEx 5.x from GitHub via `downloader.js`, not this module.

---

## See also

`DOWNLOADER.md` (the GitHub requirements auto-downloader, the cross-module version-pinning table,
and the mono BepInEx 5.x path these builds are the IL2CPP alternative to).
`TEMPLATES_OVERVIEW.md` (which templates bundle a downloader module copy).
`templates/TEMPLATE_UNITYMELONLOADERBEPINEX_HYBRID.md` (the only template carrying this module,
and how its requirement sets are kept apart from the GitHub ones).
`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`start-install-download` events this module hands
off to). `VORTEX_MOD_INSTALL.md` (installing the downloaded artifact as a managed mod).
`VORTEX_MOD_LIST.md` (the `customFileName || logicalFileName || fileName || name` rule that decides
which name a requirement shows under).
`GAMEBANANA_API.md`, `MODDB_API.md`, `MODWORKSHOP_API.md`, and `THUNDERSTORE_API.md` (the other
non-GitHub hosts with a sibling downloader module; ModDB is the other "no API, parse the page" case,
and the only one whose host bot-blocks non-browser clients).
`FCMODDING_API.md` (the Far Cry Mod Installer host — the other module ordering requirements
numerically rather than by semver, there by build timestamp).
`CODEBERG_API.md` (the Forgejo/Gitea release API — the sibling module closest to the GitHub one,
since its releases carry real version tags and the same payload field names).
`GITHUB_API.md` (where BepInEx 5.x ships instead - ordinary GitHub releases - plus GitHub's own
CI-artifact route, which has the same "builds, not releases" ordering problem this host does).
