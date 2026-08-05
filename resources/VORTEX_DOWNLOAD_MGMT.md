# Vortex Download Management (runtime)

How Vortex fetches mod archives — `nxm://` links, browser hand-offs, the download queue, chunked
parallel downloads, pause/resume, and the speed limit.

> **Disambiguation.** This is **Vortex's built-in download manager** (the app subsystem). It is
> **not** `DOWNLOADER.md`, which covers the third-party *requirements
> auto-downloader* (`downloader.js`) that game extensions in `ChemBoy1-Vortex-Games` embed to pull
> their dependencies. Different thing entirely.

## Architecture — three layers across two processes

| Layer | Where | Role |
| --- | --- | --- |
| **Engine (main)** | `Vortex/src/main/src/downloading/` | The actual transfer: `DownloadManager` (`manager.ts`), `downloader.ts` (chunked download), `resolver.ts`, `retry.ts`, `progress.ts`, `ipc.ts` |
| **State + UI (renderer)** | `download_management` core ext | Redux state (`persistent.downloads.files`), download views, protocol handler registration, metadata (`queryDLInfo`), speed-limit math (`util/throttle.ts`) |
| **Bridge** | `IPCDownloadAdapter.ts` (renderer) | Connects renderer actions/events to the main-process `window.api.downloader` |

The renderer **does not** do the transfer; it dispatches to the main process over IPC and mirrors
progress back into Redux.

## Download state machine

`IDownload` (`download_management/types/IDownload.ts`) lives at
`state.persistent.downloads.files[id]`. Its `state` (`DownloadState`) moves through:

```text
init -> started -> (paused) -> finalizing -> finished
                         \-> failed
                          \-> redirect
```

Key `IDownload` fields: `state`, `urls[]` (sorted by preference), `game[]` (compatible game ids),
`size`, `received` (bytes so far), `modInfo`, `installed?: { gameId, modId }`.

## Protocol handlers

A download usually starts from a URL scheme. Handlers are registered with
`api.registerProtocol(scheme, isHTTPS, handler)` (the public `registerDownloadProtocol`):

- `download_management` registers **`http`/`https`** (re-registering after `deregisterProtocol`).
- `nexus_integration` registers **`nxm`** — it parses the `nxm://` URL (`NXMUrl`), resolves it to a
  real, possibly time-limited CDN URL via the Nexus API, and enqueues the download.

The handler's job is to turn the URL into something the engine can fetch, then enqueue it.

## Chunked, resumable transfer (engine)

`downloader.ts` probes the resource size, then a **chunker** splits it into byte ranges. Chunks are
downloaded **concurrently** through a `PQueue` (`chunkConcurrency`, default per config). Resume is
range-based:

- `completedRanges` records which byte ranges are already on disk; pending chunks are those not
  fully covered, fetched with HTTP `Range` requests.
- **Pause** asks the main downloader for a **checkpoint** (`window.api.downloader.pause(id)`);
  **resume** replays from that checkpoint (`window.api.downloader.resume(checkpoint)`).
- `resolver.ts` normalizes a resource into `{ probeEndpoint, chunkEndpoint }` so probing and
  chunk fetches can use different URLs (e.g. a redirect/CDN endpoint). `retry.ts` handles transient
  failures.
- `IPCDownloadAdapter` auto-resumes interrupted downloads on startup from their checkpoints; a
  download missing the validating etag is **not** resumable and is re-requested fresh instead.
  `download.pausable` controls whether the UI shows a pause button.

## Speed limit

`util/throttle.ts` enforces a byte-rate cap: it converts the configured bits-per-second to a target
byte budget for the elapsed time and delays when the actual speed exceeds it. The UI download
speed is pushed back via `setDownloadSpeed(...)`.

## End-to-end flow

```text
nxm:// link (or browser/CLI URL)
  -> protocol handler resolves URL -> enqueue in main DownloadManager
  -> chunked download (PQueue, Range resume) -> progress mirrored to persistent.downloads.files[id]
  -> state: finished  -> download-finished notification
  -> start-install-download -> InstallManager (VORTEX_MOD_INSTALL.md)
```

## Events (runtime)

| Event | Purpose |
| --- | --- |
| `start-download-url` (url, …, install) | Begin a download from a URL |
| `import-downloads` (paths, cb) | Adopt existing archive files |
| `start-install-download` (dlId, …) | Hand a finished download to the installer |
| `download-finished` | Download completed (notification group) |
| `pause-download` / `resume-download` (id) | Pause/resume (via checkpoint) |
| `did-import-downloads` / `downloads-refreshed` | Bookkeeping |

`queryDLInfo` fills missing download metadata (game, mod info) after the fact.

## Download-event arguments are schema-validated

`IPCDownloadAdapter` (`src/renderer/src/IPCDownloadAdapter.ts`) does not trust the arguments of the
four download events. Each listener runs the incoming `args` array through a zod tuple with
`safeParse`, and **on a parse failure it logs a warning and returns** — no download starts, nothing
pauses, no callback fires, no error surfaces in the UI. From the extension's side an emit with the
wrong argument shape simply does nothing. The only evidence is a
`failed to parse '<event>' args` line in `vortex.log`.

What each tuple accepts:

| Event | Positional args |
| --- | --- |
| `start-download` | `urls: (string \| URL)[]`, `modInfo: object`, `fileName?: string`, `callback?: fn`, `redownload?: 'never'\|'ask'\|'replace'\|'always'`, `options?: { allowInstall?: boolean \| 'force' }` |
| `remove-download` | `downloadId: string`, `callback?: fn` |
| `pause-download` | `downloadId: string`, `callback?: fn` |
| `resume-download` | `downloadId: string`, `callback?: fn`, `options?: { allowInstall?: boolean \| 'force' }` |

The traps in practice:

- **`start-download` arg 0 must be an array.** Passing a bare URL string is the single most common
  way to get a silent no-op. `api.events.emit('start-download', [url], modInfo, ...)`.
- **`redownload` is a closed enum.** Any other string fails the *whole* tuple, so the download
  doesn't start at all — it isn't just that argument being ignored.
- `modInfo` is a loose object with a `.catch()` fallback, so it never fails validation. Extra keys
  pass through.
- Every tuple ends in `.rest(z.unknown())`, so **surplus trailing arguments are tolerated** and
  ignored. Vortex's own `DownloadView` relies on this, emitting `remove-download` with a third
  options argument the schema doesn't declare.

Note that these schemas, not the `ApiEvents` interface in `IExtensionContext.ts`, are what actually
runs. The two disagree — `ApiEvents` types `start-download` as returning a `string` and omits
`remove-download`'s third argument. Treat `ApiEvents` as editor assistance and this table as the
contract. See `VORTEX_EVENT_BUS.md` for the typed-events layer.

## Gotchas

- Don't confuse with the requirements auto-downloader (`DOWNLOADER.md`).
- The transfer runs in **main**; the renderer only orchestrates over IPC — debugging a stuck
  download means looking at `src/main/src/downloading/`, not just the core ext.
- Not every download is resumable (missing etag → fresh re-request); `pausable` reflects this.
- `nxm://` resolution can yield a **time-limited** URL — a long-paused nxm download may need
  re-resolution.

## See also

Runtime siblings: `VORTEX_NEXUS_INTEGRATION.md` (nxm + Nexus URLs), `VORTEX_MOD_INSTALL.md` (what
happens after `download-finished`), `VORTEX_MOD_METADATA.md` (the MD5 meta lookup `finalizeDownload`
kicks off), `VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. **Not**
`DOWNLOADER.md`.
