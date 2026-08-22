# Codeberg / Forgejo Releases API

[Codeberg](https://codeberg.org) is a community-run Git host built on **Forgejo**, a fork of Gitea. It is where several PC game fixes are published — most visibly Lyall's ASI-plugin fixes, which moved there from GitHub — so it is a mod-requirement source in the same sense GitHub is.

Its REST API is deliberately shaped like GitHub's. The three release endpoints an auto-downloader needs return the same field names, which is why the Codeberg module is a near-sibling of the GitHub one rather than a fresh design.

| Surface | URL | Purpose |
| --- | --- | --- |
| Latest stable release | `https://codeberg.org/api/v1/repos/{owner}/{repo}/releases/latest` | Newest non-draft, non-prerelease release |
| Release list | `https://codeberg.org/api/v1/repos/{owner}/{repo}/releases?limit=N` | Newest-first array, includes pre-releases |
| Release by tag | `https://codeberg.org/api/v1/repos/{owner}/{repo}/releases/tags/{tag}` | One specific release |
| Repo file | `https://codeberg.org/api/v1/repos/{owner}/{repo}/contents/{path}` | Base64 file content, for reading a README |
| Instance version | `https://codeberg.org/api/v1/version` | Reports the Forgejo build, e.g. `16.0.0-dev-694+gitea-1.22.0` |
| Human releases page | `https://codeberg.org/{owner}/{repo}/releases` | Manual-download page |

No authentication is needed for any public repository. Probed live against `Lyall/MGSVFix`: all three release endpoints answer `200` with `Content-Type: application/json;charset=utf-8`.

---

## The Release Payload

Trimmed to the fields that matter:

```json
{
  "tag_name": "0.0.3",
  "name": "0.0.3",
  "draft": false,
  "prerelease": false,
  "published_at": "2026-06-11T23:53:53+02:00",
  "html_url": "https://codeberg.org/Lyall/MGSVFix/releases/tag/0.0.3",
  "assets": [
    {
      "id": 1477751,
      "name": "MGSVFix_0.0.3.zip",
      "size": 786976,
      "created_at": "2026-06-11T23:54:35+02:00",
      "browser_download_url": "https://codeberg.org/Lyall/MGSVFix/releases/download/0.0.3/MGSVFix_0.0.3.zip",
      "type": "attachment"
    }
  ]
}
```

**A Forgejo asset carries `created_at` and no `updated_at`.** This is the one field-level difference from GitHub that changes code: GitHub's asset objects have both, and the GitHub module's asset-date tracking prefers `updated_at`. Any date-based comparison against Codeberg must read `created_at`, or it reads `undefined` and every check reports "no update".

`hide_archive_links`, `tarball_url`, `zipball_url` and `archive_download_count` are Forgejo additions with no GitHub counterpart. None are useful here — the source tarballs are not what a mod requirement wants.

---

## Asset Downloads Need No Resolution Step

`browser_download_url` is the download. Probed:

```text
GET https://codeberg.org/Lyall/MGSVFix/releases/download/0.0.3/MGSVFix_0.0.3.zip
  -> 200 OK
     content-type: application/octet-stream
     content-disposition: inline; filename="MGSVFix_0.0.3.zip"
     content-length: 786976
     accept-ranges: bytes
```

A plain `200`, unauthenticated, with no redirect to a signed storage URL — unlike GitHub, which `302`s asset downloads. The URL therefore goes straight to Vortex's download manager, the same way ModWorkshop and Thunderstore URLs do, and there is no direct-fetch fallback route to maintain.

`accept-ranges: bytes` means Vortex's chunked/resumable download path works normally.

---

## Rate Limiting

The API host sends **no `x-ratelimit-*` headers at all**, so there is no budget to account for and no rate-limit branch worth writing — the GitHub module's `x-ratelimit-remaining` check has nothing to read here.

The asset host does advertise a policy:

```text
ratelimit-policy: "baseline";q=2000;w=600
ratelimit: "baseline";r=1991;t=600
```

2000 requests per 600 seconds. An extension that checks one release per session is nowhere near it.

---

## Any Forgejo or Gitea Instance

Nothing above is Codeberg-specific — it is the Forgejo/Gitea API, and `codeberg.org` is simply the instance that hosts these projects. Self-hosted Forgejo and Gitea instances expose the same `/api/v1/repos/{owner}/{repo}/releases*` routes.

`codeberg_downloader.js` therefore takes the API base as an optional requirement field rather than hardcoding it, and derives the human page URL from it by stripping the `/api/v1` suffix. A requirement hosted on another instance needs no second module.

Gitea and Forgejo have diverged since the fork, but not in these routes or these field names.

---

## Shared codeberg_downloader.js Module

`resources/downloader/codeberg_downloader.js` packages the above into a reusable requirements auto-downloader — the Codeberg counterpart to the GitHub `downloader.js` and the GameBanana/ModDB/ModWorkshop/Thunderstore/BepInEx-BE/fcmodding companions (see `DOWNLOADER.md`). It resolves the current release asset, downloads and installs it as a managed mod, and raises an "update available" notification when a newer release appears.

As with the other downloader modules, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_codeberg_downloader.js`.

It is a companion-sized module rather than a fork of `downloader.js`: Codeberg has no CI-artifact equivalent to the GitHub Actions nightly mode, and no adopter so far needs the direct-copy mode for naked (non-archive) assets. What it does carry over verbatim is the version-parsing ladder, because upstreams tag releases the same way whichever forge they publish on.

### The requirement object

The entry points take an array of requirement objects (conventionally a `CODEBERG_REQUIREMENTS` constant in `index.js`), each describing one Codeberg requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `repo` | yes | `'{owner}/{repo}'`, e.g. `'Lyall/MGSVFix'`. |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications, in error messages, and in the mod list (stamped as the mod's `customFileName`). |
| `assetPattern` | recommended | RegExp tested against the release asset name; capture group 1 is the version. Required as soon as a release ships more than one file — without it the first asset is taken. |
| `apiBase` | optional | REST base for the instance. Default `https://codeberg.org/api/v1`. |
| `pageUrl` | optional | Manual-download page opened on install failure, and the mod's "Source" link. Default derived from `apiBase` + `repo`. |
| `fallbackVersion` | optional | Version stamped when no version can be resolved. |
| `allowPrerelease` | optional | `true` -> fetch the newest release including pre-releases, scanning newest-first past releases that carry no matching asset. Default uses `/releases/latest` (stable only). |
| `releaseTag` | optional | Fetch one fixed release by tag, for a rolling tag upstream *moves*. Same role `prereleaseTag` plays in `downloader.js`. |
| `trackByAssetDate` | optional | `true` -> detect updates by the asset's upload time instead of the version tag, for a rolling tag whose name never changes. Reads `created_at`. |
| `autoInstall` | optional | `false` -> never install this requirement unattended. Both the update check and any setup call leave it alone; only an explicit user action installs it. |
| `pinVersion` | optional | Hold this requirement at one specific release instead of tracking the newest. While the installed version equals the pin, the update check makes no HTTP request. |
| `pinTag` | with `pinVersion` | The tag to fetch when it is not simply `pinVersion`. The same tag with its leading `v` toggled is retried automatically, so most repos need no `pinTag`. |

There is no `assemblyFileName`: installed-detection is purely by mod type, as in the other non-GitHub companions.

### Exports

| Export | Role |
| --- | --- |
| `downloadCodeberg(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially), then enable it, set its mod type, and record the version attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point. |
| `checkForCodebergUpdate(api, gameSpec, requirements)` | For each requirement: install it if missing (unless `autoInstall: false`), otherwise compare the installed marker against the current release; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler. |
| `downloadCodebergRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadCodeberg`. |
| `checkForCodebergUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForCodebergUpdate`. |
| `isCodebergRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. Useful for gating an "offer this" notification. |
| `getLatestCodebergAsset(api, requirement)` | The chosen release asset, with its parent release attached as `release`, or `null`. |
| `getLatestCodebergVersion(requirement, asset)` | Display/compare version for that asset, or `null`. |

### How a version string is parsed

Every version string — release tag, asset-filename capture, stamped mod attribute, pin — goes through one helper, `toComparableVersion()`, which tries three interpretations in order and validates before returning:

1. **Already valid semver — taken as authored.** A prerelease identifier is real version information and survives; some upstreams tag `3.1.0-6`, where `-6` is a prerelease, not a fourth segment.
2. **Four numeric segments — the fourth becomes a prerelease identifier.** `5.4.23.5` -> `5.4.23-5`. semver holds only three segments, so fourth-segment builds would otherwise all compare equal.
3. **Anything else — normalize then `semver.coerce()`.** Every `-`/`_` between digits becomes `.` (`v1-2-3` -> `v1.2.3`, `6_1_1` -> `6.1.1`), and short versions widen (`19.0` -> `19.0.0`).

Both sides of a comparison run through it. If one side kept a prerelease identifier and the other coerced it away, every check would report "up to date" forever. `DOWNLOADER.md` documents the same ladder in more depth, including the leading-zero case that falls through to the caller's `0.0.0` floor.

When a release is fetched, the version embedded in the **asset filename** (the `assetPattern` capture group) is preferred over the release tag, so a rolling-tag repository whose tag carries no version still tracks correctly.

### Behaviors worth knowing

- **The asset URL goes straight to the download manager.** No redirect resolution, no direct-fetch fallback, no `skipDownloadManager` field — the URL from the API is the file.
- **`created_at`, never `updated_at`.** Asset-date tracking reads `created_at` because Forgejo assets have no `updated_at`; the mod attribute is `codebergAssetDate` and is stamped on every install regardless of mode, so switching a requirement to `trackByAssetDate` later does not need a reinstall.
- **A pin costs nothing.** When the installed version already equals `pinVersion` the update check returns before any HTTP request.
- **The leading-`v` retry.** A pinned tag is tried as written and then with its leading `v` toggled, so `0.0.2` and `v0.0.2` both resolve whichever way upstream spelled it. Only a pin gets a second candidate URL.
- **Release scanning skips assetless releases.** With `allowPrerelease`, a source-only or partially uploaded release does not hide an asset that exists in an older one — the scan continues newest-first.
- **A renamed asset is reported, not swallowed.** When nothing matches `assetPattern`, the module logs the pattern, how many releases it checked, and what the newest release actually contains, and raises a non-reportable error notification saying the file was most likely renamed.
- **`autoInstall: false` is the opt-in-by-user mode.** The update check skips a missing requirement entirely instead of installing it, which is what makes a notification-gated optional requirement possible. Pair it with a toolbar action, or a user who dismissed the notification permanently has no way back.
- **The mod list shows `userFacingName`, not the archive name.** Vortex renders a mod as `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps `fileName` with the downloaded archive — so the install also stamps `customFileName` from `userFacingName`. Rendering rule: `VORTEX_MOD_LIST.md`.
- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to the releases page — Vortex renders this as a clickable "Source" link in the mod details panel.
- **No silent auto-update.** The update check only notifies; the user-driven Download action performs the update.
- **Updating disables the version it replaces.** An update installs a second mod entry rather than replacing the first, so the mod ids carrying the requirement's mod type are captured before the install and disabled in the same batch that enables the new one — otherwise two copies deploy on top of each other.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. a double-clicked toolbar action), keyed by mod type.
- **Install failure opens the releases page.** A failed download/install shows an error notification and opens the manual-download page.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.

### Wiring

For a mandatory requirement (a mod loader), install it unattended:

```js
const { downloadCodeberg, checkForCodebergUpdate } = require('./codeberg_downloader');

const XXX_ID = `${GAME_ID}-xxx`;
const XXX_NAME = "Loader Name";
const CODEBERG_REQUIREMENTS = [
  {
    repo: 'author/Repo',
    modType: XXX_ID,
    userFacingName: XXX_NAME,
    assetPattern: /^Repo_(\d+\.\d+(?:\.\d+)?)/i,
  },
];

// in setup()
await downloadCodeberg(api, gameSpec, CODEBERG_REQUIREMENTS);
await checkForCodebergUpdate(api, gameSpec, CODEBERG_REQUIREMENTS).catch(() => null);
```

For an **optional** requirement — a fix or a QoL plugin the user should choose — set `autoInstall: false` and offer it from a notification instead. This is the pattern `game-metalgearsolidvtpp` uses for MGSVFix:

```js
const { downloadCodeberg, isCodebergRequirementInstalled } = require('./codeberg_downloader');

// in setup(), instead of downloadCodeberg
function downloadXxxNotify(api) {
  if (isCodebergRequirementInstalled(api, GAME_ID, CODEBERG_REQUIREMENTS[0])) return;
  const NOTIF_ID = `${GAME_ID}-xxx`;
  const MESSAGE = `Would you like to download ${XXX_NAME}?`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadCodeberg(api, spec, CODEBERG_REQUIREMENTS);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `${XXX_NAME} does XXX.\n`,
          }, [
            { label: `Download ${XXX_NAME}`, action: () => { downloadCodeberg(api, spec, CODEBERG_REQUIREMENTS); dismiss(); } },
            { label: 'Not Now', action: () => dismiss() },
            { label: 'Never Show Again', action: () => { api.suppressNotification(NOTIF_ID); dismiss(); } },
          ]);
        },
      },
    ],
  });
}
```

Both modes share the update check and the toolbar action:

```js
// in context.once()
api.onAsync('check-mods-version', (gameId, mods, forced) => {
  if (gameId !== GAME_ID) return;
  return checkForCodebergUpdate(api, spec, CODEBERG_REQUIREMENTS)
    .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
});

// in applyGame() - REQUIRED for an autoInstall: false requirement
context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
  downloadCodeberg(context.api, spec, CODEBERG_REQUIREMENTS, false);
}, () => selectors.activeGameId(context.api.getState()) === GAME_ID);
```

---

## Reference Adopter: MGSVFix

[MGSVFix](https://codeberg.org/Lyall/MGSVFix) is an ASI plugin for *Metal Gear Solid V: The Phantom Pain* (and *Ground Zeroes*) that skips intro logos, unlocks the framerate and resolution options, fixes HUD and graphical effects at ultrawide resolutions, and tweaks LOD distances.

`MGSVFix_0.0.3.zip` unpacks **flat**, with no folder root, straight into the game folder:

| Entry | Role |
| --- | --- |
| `MGSVFix.asi` | The plugin itself |
| `MGSVFix.ini` | Its settings, edited by the user after install |
| `winmm.dll` | Ultimate ASI Loader, the proxy DLL that loads the `.asi` |
| `EXTRACT_TO_GAME_FOLDER` | Empty marker file, an instruction to humans |

Two consequences for the extension:

- The mod type targets `{gamePath}` and the installer flattens to the game root. A generic root-folder installer keyed on a data-folder name will not claim this archive, so a dedicated `registerInstaller` test/install pair is required, registered ahead of the root installer in the priority ladder.
- The installer drops `EXTRACT_TO_GAME_FOLDER` explicitly. It is an instruction, not a game file, and deploying it litters the game folder.

Because it is a fix rather than a requirement, its requirement carries `autoInstall: false` and it is offered by the setup notification shown above — Vortex never installs it on its own.

---

## Caveats

- **Codeberg is volunteer-run.** It has no uptime guarantee comparable to GitHub's. Every API failure path in the module degrades to "no update detected" plus a log line rather than an error the user has to act on.
- **`limit` caps at the instance's configured maximum.** The default page size is small; ask for what you need explicitly rather than assuming the whole release history comes back.
- **Bare tags are common.** `Lyall/MGSVFix` tags `0.0.3`, not `v0.0.3`. Do not assume the GitHub-style leading `v` when writing a pin — the automatic retry covers the mistake, but the log will show two requests instead of one.
- **Source archive links can be hidden.** `hide_archive_links: true` means the web UI does not offer the tarball. It has no effect on the API or on release assets.

---

## See also

`DOWNLOADER.md` (the GitHub requirements auto-downloader, the shared local-copy model, the full
version-parsing ladder, and the cross-module version-pinning table).
`GAMEBANANA_API.md`, `MODDB_API.md`, `MODWORKSHOP_API.md`, and `THUNDERSTORE_API.md` (the other
non-GitHub mod hosts, each with a sibling downloader module; the ModWorkshop and Thunderstore ones
are the closest in shape to this one, since those hosts also serve direct download URLs).
`BEPINEX_BE_BUILDS.md` and `FCMODDING_API.md` (the two sibling modules ordered by build number and
build timestamp rather than by version).
`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`start-install-download` events this module hands
off to). `VORTEX_MOD_INSTALL.md` (installing the downloaded archive as a managed mod).
`INSTALLER_SYSTEM.md` (the `registerInstaller` test/install pair each adopter writes for its
requirement, and where it sits in the priority ladder).
`NOTIFICATIONS_DIALOGS.md` (the notification and dialog surfaces the optional-requirement wiring
uses, including `allowSuppress` and `suppressNotification`).
`VORTEX_MOD_LIST.md` (the `customFileName || logicalFileName || fileName || name` rule that decides
which name a requirement shows under).
`TEMPLATES_OVERVIEW.md` (which templates bundle a downloader module copy).
`GITHUB_API.md` (the API Forgejo's is modelled on, and the one the sibling `downloader.js`
targets - including the asset `updated_at` field Forgejo does not have).
