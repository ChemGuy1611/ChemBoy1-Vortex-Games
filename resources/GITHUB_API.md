# GitHub REST API (Releases, Assets, and CI Artifacts)

GitHub is where most modding requirements live — script loaders, frameworks, runtimes, ASI plugins, and the CI builds that precede their releases. It is the only source `downloader.js` talks to, and every other downloader module in `resources/downloader/` exists because some upstream publishes *somewhere else*.

This document covers the API itself: which endpoints answer, what they return, what the download hosts do, and where an unauthenticated client gets bitten. The module that consumes it — requirement objects, version resolution, update notifications — is documented separately in `DOWNLOADER.md`.

Everything below was probed live against public repositories (`UE4SS-RE/RE-UE4SS`, `LavaGang/MelonLoader`) with no credentials, which is the situation a Vortex extension is always in.

---

## Surface Map

| Host | Role | Auth |
| --- | --- | --- |
| `https://api.github.com` | The REST API. Releases, tags, contents, Actions runs, rate limit. | Optional; unauthenticated works for public repos |
| `https://github.com/{owner}/{repo}/releases/download/{tag}/{file}` | Public asset download. `302`s to the storage host. | None |
| `https://release-assets.githubusercontent.com` | Where release-asset downloads actually land, behind a short-lived signed URL. | Signature in the URL |
| `https://raw.githubusercontent.com` | Raw file content from a branch or tag. Not part of the REST API and not rate-limited by it. | None |
| `https://codeload.github.com` | Source zip/tarball downloads, which `zipball_url` / `tarball_url` redirect to. | None |
| `https://nightly.link` | Third-party service that hands out GitHub Actions artifacts without a token. | None |
| `https://api.github.com/graphql` | GraphQL v4. **Requires authentication** — unusable from an extension. | Required |

The REST API is versioned by date. Requests carry `X-GitHub-Api-Version: 2022-11-28` implicitly; responses echo the choice as `x-github-api-version-selected`. There is no need to send it, and no newer version to opt into as of writing.

---

## Endpoints That Matter Here

| Endpoint | Returns |
| --- | --- |
| `GET /repos/{owner}/{repo}/releases/latest` | The newest release that is neither a draft nor a pre-release. One object. |
| `GET /repos/{owner}/{repo}/releases?per_page=N` | Newest-first array of releases, **including pre-releases**. |
| `GET /repos/{owner}/{repo}/releases/tags/{tag}` | One release by its tag name. The only way to reach a rolling tag. |
| `GET /repos/{owner}/{repo}/releases/assets/{id}` | One asset — metadata as JSON, or the file itself with `Accept: application/octet-stream`. |
| `GET /repos/{owner}/{repo}/tags?per_page=N` | Tag names with their commit SHAs. No release data. |
| `GET /repos/{owner}/{repo}/contents/{path}` | One file, base64-encoded, plus a `download_url` pointing at the raw host. |
| `GET /repos/{owner}/{repo}/actions/workflows/{file}/runs` | Workflow run listing. Filterable by `branch`, `status`, `event`. |
| `GET /repos/{owner}/{repo}/actions/runs/{id}/artifacts` | Artifacts a run produced. Metadata is public; the download is not. |
| `GET /repos/{owner}/{repo}/actions/artifacts/{id}/zip` | The artifact itself. **`401` without a token.** |
| `GET /repos/{owner}/{repo}` | Repo metadata — `default_branch`, `archived`, `license`, `pushed_at`. |
| `GET /rate_limit` | Current budget for every bucket. Does not itself consume budget. |

---

## The Release Payload

Trimmed to the fields worth reading, from `UE4SS-RE/RE-UE4SS`:

```json
{
  "tag_name": "v3.0.1",
  "name": "v3.0.1",
  "target_commitish": "main",
  "draft": false,
  "prerelease": false,
  "created_at": "2024-02-14T19:49:51Z",
  "published_at": "2024-02-14T19:59:38Z",
  "html_url": "https://github.com/UE4SS-RE/RE-UE4SS/releases/tag/v3.0.1",
  "tarball_url": "https://api.github.com/repos/UE4SS-RE/RE-UE4SS/tarball/v3.0.1",
  "zipball_url": "https://api.github.com/repos/UE4SS-RE/RE-UE4SS/zipball/v3.0.1",
  "immutable": false,
  "assets": [ ... ]
}
```

Field notes that change code:

- **`tag_name` is the identity; `name` is a title.** They match on most repos and diverge on plenty — `name` is free text and is sometimes empty, sometimes a headline ("Hotfix for the crash on startup"). Version parsing belongs on `tag_name`, never on `name`. Vortex's own release check is the counter-example, and only because Nexus controls both fields on its own repo.
- **`created_at` is the commit/tag date, `published_at` is when the release went public.** They differ by minutes on a normal release and by *months* on a draft that sat unpublished. Anything comparing release recency wants `published_at`.
- **`target_commitish` is only meaningful for a draft.** Once published it is frozen at the branch name the release was cut from, which is not where the tag necessarily points now.
- **`tarball_url` / `zipball_url` are not assets.** GitHub attaches auto-generated source archives to every release; they never appear in `assets[]`. A mod requirement never wants them — they hold source, not the built artifact.
- **`immutable`** marks a release using GitHub's immutable-releases feature (tag and assets locked after publish). Informational only.
- **`upload_url`**, `assets_url`, `author`, `body`, `reactions` round out the object. `body` is the release notes in Markdown, useful if an extension wants to show a changelog.

### Which endpoint for which release strategy

| Upstream publishing habit | Endpoint | Notes |
| --- | --- | --- |
| Ordinary versioned releases | `/releases/latest` | Excludes drafts and pre-releases automatically. |
| Ships pre-releases users want | `/releases` | Newest-first; scan past releases that carry no matching asset. |
| Rolling tag that upstream *moves* (UE4SS `experimental-latest`, EntityAtlan `ModLoader`) | `/releases/tags/{tag}` | `/releases/latest` cannot see it: a moved tag is usually flagged pre-release, and even when it is not, its `published_at` may be older than a real release. |
| One specific known-good version | `/releases/tags/{tag}` | Tags are inconsistent about a leading `v`; retry the other spelling on a `404`. |

`/releases/latest` does not mean "the most recently published release". It means "the newest release, by tag ordering, that is neither draft nor pre-release". A repo that publishes only pre-releases has a `/releases/latest` that returns `404` — the same status a nonexistent repo returns.

---

## The Asset Payload

```json
{
  "id": 151575008,
  "name": "UE4SS_v3.0.1.zip",
  "label": null,
  "content_type": "application/zip",
  "state": "uploaded",
  "size": 5523402,
  "download_count": 1252041,
  "digest": null,
  "created_at": "2024-02-14T19:59:38Z",
  "updated_at": "2024-02-14T19:59:39Z",
  "url": "https://api.github.com/repos/UE4SS-RE/RE-UE4SS/releases/assets/151575008",
  "browser_download_url": "https://github.com/UE4SS-RE/RE-UE4SS/releases/download/v3.0.1/UE4SS_v3.0.1.zip"
}
```

- **`browser_download_url` is the download; `url` is the metadata.** Fetching `url` returns JSON unless the request carries `Accept: application/octet-stream`, in which case it `302`s to the same storage URL `browser_download_url` does. Either route works unauthenticated on a public repo.
- **`updated_at` is the upload-time clock a rolling tag needs.** A repository that never changes its tag name still re-uploads assets, so the asset timestamp is the only thing that moves. GitHub assets carry both `created_at` and `updated_at`; Forgejo/Gitea assets carry only `created_at`, which is the difference that separates `downloader.js` from `codeberg_downloader.js` (`CODEBERG_API.md`).
- **`state` is `uploaded` when the file is usable.** A release published while an asset is still uploading exposes it as `starter`. Rare, but it is what a partially-uploaded release looks like from the API.
- **`digest` is `sha256:…` on newer uploads and `null` on older ones** — the field was added long after most existing assets were uploaded, so it cannot be relied on for integrity checking of an arbitrary repo's back catalogue.
- **`label`** is an optional display name shown instead of `name` on the release page. The filename that ends up on disk comes from `name`, never `label`.

---

## Downloading an Asset

`browser_download_url` does not serve the file. It `302`s:

```text
GET https://github.com/UE4SS-RE/RE-UE4SS/releases/download/v3.0.1/UE4SS_v3.0.1.zip
  -> 302 Found
     location: https://release-assets.githubusercontent.com/github-production-release-asset/561442199/…
               ?sp=r&se=2026-08-21T21:28:45Z&…&sig=…&jwt=…
               &response-content-disposition=attachment%3B%20filename%3DUE4SS_v3.0.1.zip
```

Following it:

```text
  -> 200 OK  (206 with a Range header)
     content-type: application/octet-stream
     content-disposition: attachment; filename=UE4SS_v3.0.1.zip
     content-length: 5523402
     accept-ranges: bytes
```

What this means in practice:

- **The signed URL is short-lived** (the `se=` expiry sits about an hour out) and is minted per request. It cannot be cached, stored in a requirement definition, or handed to a user as a stable link. Only the `github.com/.../releases/download/...` form is stable.
- **The storage hostname has changed before.** Release assets served from `objects.githubusercontent.com` historically and now come from `release-assets.githubusercontent.com`. Never pin download logic to the redirect target — follow the redirect instead.
- **`accept-ranges: bytes`** on the storage host means Vortex's chunked and resumable download path works normally, and a partially downloaded requirement resumes rather than restarting.
- **Redirect following is automatic** through `fetch` in the Electron renderer, and through Vortex's own download manager. Nothing in an extension needs to handle the `302` explicitly.

---

## Rate Limiting

This is the part that actually bites an extension, because an extension cannot authenticate — there is nowhere to put a token that is not shipped to every user.

| Bucket | Unauthenticated | With a personal access token |
| --- | --- | --- |
| `core` (everything below) | **60 / hour**, per IP | 5,000 / hour, per token |
| `search` | 10 / minute | 30 / minute |
| `graphql` | **0** — GraphQL is closed to anonymous callers | 5,000 points / hour |

Every response carries the accounting:

```text
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 52
X-RateLimit-Used: 8
X-RateLimit-Reset: 1787348940      (unix seconds)
X-RateLimit-Resource: core
```

### Recognising a rate-limited response

A rate-limited request comes back as **`403`, or sometimes `404`** — not `429`. The status alone is useless; the discriminator is `x-ratelimit-remaining: 0` being present on the response. Treat a `403`/`404` as rate limiting *only* when that header exists and reads zero, because plenty of other failures share the status:

- A missing `User-Agent` header returns `403` with an HTML body and **no** rate-limit headers.
- A repo that exists but has no releases returns `404` from `/releases/latest`, with a full budget.
- A private, deleted, or moved-away repo returns `404`, indistinguishable from a typo.
- Anonymous GraphQL returns `403 rate limit exceeded` with `X-RateLimit-Limit: 0` — which *is* the rate limiter, just permanently at zero.

Secondary ("abuse detection") limits are separate from the primary budget and fire on burst concurrency rather than volume. They answer `403` or `429` with a `retry-after` header in seconds. Sequential requests at extension pace never reach them.

### Conditional requests do not save an anonymous caller

The standard advice is to send `If-None-Match` with a stored `ETag` and let a `304 Not Modified` come back free. Probed against `/releases/latest`, that holds **only when authenticated**:

| Call | `X-RateLimit-Used` before → after |
| --- | --- |
| Unauthenticated `304` | 6 → 7, and again 7 → 8 |
| Authenticated `304` | 8 → 8 |

So for an extension — always anonymous — an ETag saves bandwidth and parsing, not budget. The 60/hour ceiling is spent by *requests*, and the only way to spend fewer is to make fewer. Also note the `ETag` returned for the same release differed between the authenticated and unauthenticated responses, so an ETag captured in one auth context is not portable to the other.

### Budgeting for an extension

60 requests per hour is shared by everything on the user's IP, including their browser and any other tool hitting GitHub. An extension that checks four requirements on every `check-mods-version` spends four of them. That is fine; what is not fine is a per-mod or per-file loop.

Practical rules:

- One request per requirement per check, and no polling loop.
- A pinned requirement should make **zero** requests while the installed version already equals the pin — comparing two local strings is free.
- On `ProcessCanceled` from a rate-limit detection, skip silently. The user cannot fix it and a notification only alarms them.
- Never fan out over `/releases` pages to find something; ask for the specific tag.

---

## Headers

- **`User-Agent` is mandatory.** Without it the API returns `403` and an HTML error page. Every real client sends one: Chromium's `fetch` in the Vortex renderer always attaches its own (and forbids overriding it), and Vortex core's own client sets `User-Agent: Vortex` explicitly on its node `https` requests.
- **`Accept: application/vnd.github+json`** selects the current representation. The default is already this, so it is optional; `application/vnd.github.v3+json` is the older spelling of the same thing.
- **`Accept: application/octet-stream`** on an asset's `url` switches the response from metadata to the file redirect.
- **`Authorization: Bearer {token}`** raises the budget to 5,000/hour. Correct for a maintenance script run on a developer's machine, where the token comes from an environment variable — never for shipped extension code.

---

## Repository Renames and Case

- **Owner and repo names are case-insensitive.** `/repos/ue4ss-re/re-ue4ss/releases/latest` answers `200` directly, with no redirect.
- **A renamed owner or repo `301`s, preserving the sub-path.** `/repos/zeit/next.js/releases/latest` → `301` → `/repositories/70107786/releases/latest`, which resolves to the current `vercel/next.js` release. Because `fetch` follows redirects, a requirement pointing at a renamed repo keeps working with no extension change.
- **A project that moved without a rename record simply `404`s.** `Re-UE4SS/RE-UE4SS` returns `404` even though the project is alive at `UE4SS-RE/RE-UE4SS`. There is no way to tell that apart from a typo or a deleted repo, so a requirement that starts failing needs a human to look.
- The numeric `/repositories/{id}` form is stable across every rename, and it is what GitHub itself emits in `Link` headers.

---

## Pagination

List endpoints default to 30 items and cap at `per_page=100`. Paging is advertised in the `Link` header, not the body:

```text
Link: <https://api.github.com/repositories/561442199/releases?per_page=2&page=2>; rel="next",
      <https://api.github.com/repositories/561442199/releases?per_page=2&page=8>; rel="last"
```

Note that GitHub rewrites those URLs into the `/repositories/{id}` form. Parse the header rather than constructing page URLs by hand if pages are needed at all — for requirement tracking they usually are not, since the newest page is the only interesting one.

---

## GitHub Actions Artifacts (the nightly route)

Some upstreams publish bleeding-edge builds as **Actions artifacts** rather than releases. MelonLoader's `alpha-development` branch is the reference case. No release endpoint can see these; they live under the Actions API.

The run listing is public:

```text
GET /repos/LavaGang/MelonLoader/actions/workflows/build.yml/runs
      ?branch=alpha-development&status=success&per_page=1
```

```json
{
  "total_count": 171,
  "workflow_runs": [{
    "id": 31688879682,
    "name": "0.8.0-ci.2576 | Changed Portable Dotnet Handling …",
    "run_number": 2576,
    "run_attempt": 1,
    "head_branch": "alpha-development",
    "head_sha": "…",
    "event": "push",
    "status": "completed",
    "conclusion": "success",
    "created_at": "2026-08-13T09:56:42Z",
    "updated_at": "2026-08-13T10:01:46Z",
    "artifacts_url": "https://api.github.com/repos/LavaGang/MelonLoader/actions/runs/31688879682/artifacts"
  }]
}
```

- **`run_number` is the version.** It increments per workflow, never resets, and is the only monotonic identity a CI build has — there is no tag and no semver. Compare numerically, not with semver.
- **`status=success` filters to usable runs.** Without it the newest run may be `in_progress` or `failure` and its artifacts absent or broken.
- **`per_page=1` is the whole request.** Anything more is wasted budget.
- **A renamed workflow file or a retired branch returns an empty `workflow_runs` array**, not an error. Silent by default — worth logging what was asked for.

The artifact listing is public too:

```json
{
  "id": 9176623144,
  "name": "MelonLoader.Windows.x64.CI.Release",
  "size_in_bytes": 19411843,
  "expired": false,
  "created_at": "2026-08-13T10:00:52Z",
  "expires_at": "2026-11-11T09:56:42Z",
  "archive_download_url": "https://api.github.com/repos/…/actions/artifacts/9176623144/zip"
}
```

**But the download is not.** `GET /actions/artifacts/{id}/zip` returns `401 Unauthorized` without a token, on a fully public repository. That single fact is why the nightly route exists at all in the shape it does:

- Artifacts also **expire** — 90 days by default, visible as `expires_at`, after which `expired: true` and the bytes are gone. A CI build is not an archive; it is a window.
- [`nightly.link`](https://nightly.link) is a third-party service that holds a GitHub App installation and re-serves artifacts anonymously. A `nightly.link` URL is *stable and predictable* — `https://nightly.link/{owner}/{repo}/workflows/{workflow}/{branch}/{artifact}.zip` — and always points at the newest successful run:

```text
GET https://nightly.link/LavaGang/MelonLoader/workflows/build/alpha-development/MelonLoader.Windows.x64.CI.Release.zip
  -> 302 Found
     location: https://productionresultssa15.blob.core.windows.net/actions-results/…
```

It redirects to a short-lived Azure blob URL, the same way a release asset redirects to its storage host, so the download path needs no special handling.

- **Only the newest run is reachable through a `nightly.link` URL.** There is no way to pin an older CI build through it, which is why version pinning is meaningless in nightly mode.
- Note the URL takes the workflow **name without `.yml`** (`workflows/build/`), while the Actions API takes the **file name with it** (`workflows/build.yml/runs`). A requirement tracking a nightly needs both spellings.

---

## Raw File Content

Two ways to read a file out of a repo, with very different costs:

| Route | Cost | Shape |
| --- | --- | --- |
| `GET https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}` | **No REST rate limit** — the response carries no `x-ratelimit-*` headers at all; `cache-control: max-age=300` with an `ETag` | The file, as-is |
| `GET /repos/{owner}/{repo}/contents/{path}` | Counts against the 60/hour `core` budget | JSON: `name`, `path`, `size`, `sha`, `encoding: "base64"`, `content`, plus a `download_url` pointing back at the raw host |

For reading a version file, a manifest, or a config blob, the raw host is the right choice: it is free, cached for five minutes, and needs no JSON decode. The `/contents` route earns its cost only when the SHA or the directory listing is what is wanted (passing a directory path returns an array of entries).

`{ref}` is a branch, tag, or commit SHA. A commit SHA is the only form that is stable forever.

Source archives are a third case: `zipball_url` / `tarball_url` `302` to `codeload.github.com/{owner}/{repo}/legacy.zip/refs/tags/{tag}`. These hold repository source, not built files, and are almost never what a mod requirement wants.

---

## How Vortex Core Uses GitHub

Vortex has its own small GitHub client at `src/renderer/src/util/github.ts` in the app repo. It is core-internal — **not exported through `vortex-api`**, so an extension cannot import it — but it is worth knowing because it shares the same 60/hour budget as anything an extension does:

- It queries `GET /repos/Nexus-Mods/Vortex/releases` (or `Nexus-Mods/Vortex-Staging` on a preview build) for the changelog/update surface, filtering to releases whose `name` is valid semver at or above a hardcoded cutoff.
- It fetches announcements as raw files from the repo's `announcements` branch via `raw.githubusercontent.com`, which is why they cost nothing.
- It sets `User-Agent: Vortex`, caches the release list in memory for the session, and on a `403` with `x-ratelimit-remaining: 0` it records the reset time and rejects every further request with `RateLimitExceeded` until then — a client-side gate, so a rate-limited Vortex stops asking rather than burning failures.
- Its `IGitHubRelease` / `IGitHubAsset` interfaces are an accurate typing of the payloads described above, and a useful reference even though they cannot be imported.

---

## Publishing Patterns Seen on Real Mod Repos

The API is uniform; upstream habits are not. These are the shapes that break naive version tracking, all observed on repos this project tracks:

- **Rolling tags.** UE4SS's `experimental-latest` and EntityAtlan's `ModLoader` never change name; only the assets underneath move. `/releases/latest` cannot see them and tag comparison never changes. Track the asset `updated_at` instead.
- **Versionless asset filenames.** lovely-injector ships `lovely-x86_64-pc-windows-msvc.zip` under tags like `v0.8.0` — the version exists only on the release, so it must be read from `tag_name` and stamped somewhere at install time.
- **Version only in the asset name.** The inverse: `AtlanModLoader_v_6_1_1.zip` under a static tag. Parse the filename, ignore the tag.
- **Mis-separated tags.** `v1-2-3` and `6_1_1` are not semver and need normalizing before comparison.
- **Four-segment versions.** BepInEx's `5.4.23.5` has no semver representation; the fourth segment has to be mapped onto a prerelease identifier or every `5.4.23.x` compares equal.
- **Leading-zero components.** `2026.02.01.0` is not coercible to semver at all and needs a source-specific transform.
- **Source-only or partially uploaded releases.** The newest release may carry no matching asset. Scanning further down the list rather than giving up is what keeps this from looking like a broken requirement.
- **Renamed assets.** An upstream that renames `Loader.zip` to `Loader-win64.zip` breaks matching silently, and is indistinguishable from an outage unless the failure names both the pattern and what the release actually contains.
- **Naked, non-archive assets.** A bare `.dll` published as a release asset cannot go through an archive install pipeline at all.

`DOWNLOADER.md` documents how each of these is handled in code.

---

## Caveats

- **The 60/hour anonymous ceiling is per IP, not per app.** A user on a shared or carrier-grade-NAT connection can arrive already rate-limited through no fault of the extension. Degrade to "no update detected" rather than to an error.
- **`404` is deeply overloaded.** Missing repo, moved repo, private repo, no releases, and rate limiting all produce it. Only the rate-limit headers disambiguate.
- **Draft releases are invisible without authentication**, so the `draft` flag is effectively always `false` in anonymous responses. Filtering on it anyway costs nothing and covers the authenticated case.
- **Nothing about a signed download URL is stable** — not the host, not the query string, not the expiry. Store the `github.com/.../releases/download/...` form.
- **`nightly.link` is a third-party dependency** with no uptime guarantee and no relationship to GitHub. A requirement that depends on it inherits that risk.
- **GraphQL is not an option for extension code.** Anonymous access is closed, and a shipped token is a leaked token.

---

## See also

`DOWNLOADER.md` (the requirements auto-downloader built on these endpoints: requirement fields, the
three release-endpoint strategies, version-parsing ladder, pinning, nightly and direct-copy modes).
`CODEBERG_API.md` (Forgejo/Gitea, whose release API deliberately mirrors this one — the field-level
difference that bites is the missing asset `updated_at`).
`GAMEBANANA_API.md`, `MODDB_API.md`, `MODWORKSHOP_API.md`, and `THUNDERSTORE_API.md` (the non-GitHub
mod hosts, each with a sibling downloader module).
`BEPINEX_BE_BUILDS.md` (an upstream CI-build feed served outside GitHub, ordered by build number the
way a nightly is ordered by run number) and `FCMODDING_API.md` (ordered by build timestamp).
`GODOT_MOD_LOADER.md` (a GitHub repo shipping two incompatible product lines from one release
stream — the case where `/releases/latest` is the wrong endpoint and a pin is mandatory).
`VORTEX_DOWNLOAD_MGMT.md` (what Vortex does with a download URL once an extension hands it over,
including the chunked/resumable path that `accept-ranges` enables).
`VORTEX_MOD_METADATA.md` (why a GitHub-sourced archive can end up tagged with an unrelated Nexus
`modId`).
`NEXUS_MODS_API.md` (the other API this project talks to, and the one with real authentication).
