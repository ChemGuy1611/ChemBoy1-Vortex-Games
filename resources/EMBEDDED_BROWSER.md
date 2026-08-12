# Embedded Web Content in Vortex

How a Vortex extension can show a live web page inside the app — the one-shot `browse-for-download`
dialog, the `Webview` control for pages that host a browser themselves, and the chain that turns a
click on a download link inside that content into a Vortex download.

Source: `Vortex/src/renderer/src/controls/Webview.tsx` (the control),
`Vortex/src/renderer/src/extensions/browser/` (core browser extension + its modal),
`Vortex/src/main/src/MainWindow.ts` (webview enablement, download and popup hooks),
`Vortex/src/renderer/src/webview.ts` + `Vortex/src/main/src/webview.ts` (the BrowserView IPC layer),
`Vortex/src/renderer/src/renderer.tsx` (`startDownloadFromURL`),
`Vortex/src/renderer/src/extensions/download_management/index.ts` (the `http`/`https` protocol
handlers). Types: `Webview`, `IWebviewProps`, `IWebView` in `resources/api.d.ts`.

## Two ways to show a web page

| | `browse-for-download` | `Webview` control |
| --- | --- | --- |
| Shape | Modal dialog owned by core | A component you place in your own page |
| Lifetime | One shot — closes on the first captured download URL | Lives as long as your page is mounted |
| Result | Resolves with the download URL | Nothing; downloads flow through the normal capture chain |
| Chrome | Core's: back/forward, breadcrumb, instructions, Cancel/Skip | Yours to build |
| Use it for | "Send the user to a release page and take whatever they click" | A browsing experience — search, categories, mod pages |

Both render the same underlying content, and both feed the same download capture chain.

## 1. `browse-for-download` — the supported one-shot

```js
api.emitAndAwait('browse-for-download', url, instructions)
  .then((result) => {
    // result is an array; result[0] is the URL of the file the user clicked
    if (!result || !result.length) {
      return Promise.reject(new util.UserCanceled()); // window closed without a download
    }
    api.events.emit('start-download', result, { game: gameId }, undefined, (err, dlId) => {
      api.events.emit('start-install-download', dlId, { allowAutoEnable: true }, () => null);
    });
  });
```

Behaviour worth knowing:

- The event takes `(url, instructions, skippable?)`. Core appends its own line to `instructions`:
  *"This window will close as soon as you click a valid download link."*
- Calls are queued (core wraps `doBrowse` in a queue), so two extensions asking at once take turns
  rather than fighting over one modal.
- Cancelling rejects with `UserCanceled`. With `skippable: true` the promise resolves with the
  string `err:skip` or `err:cancel` instead — check for those before treating the value as a URL.
- Before the page loads, core shows a confirmation panel explaining that Vortex is about to open
  external content on an Electron/Chrome build that may not be current. The user must click
  Continue.
- The modal closes on the first captured URL; anything the user clicks after that is a new call.

This is the mechanism most `ChemBoy1-Vortex-Games` extensions use for requirements that have no
predictable download URL — see `DOWNLOADER.md` for where it sits among the auto-download routes.

## 2. The `Webview` control — embedding a page

`webviewTag: true` is set in the main window's `webPreferences`, so Chrome's `<webview>` tag works
in the renderer. vortex-api exports the wrapper as `Webview`:

```js
const { Webview } = require('vortex-api');

React.createElement(Webview, {
  src: 'https://example.com/',
  style: { width: '100%', height: '100%' },
  onLoading: (loading) => setLoading(loading),
  onNewWindow: (url, disposition) => handlePopup(url),
  ref: (ref) => attachEvents(ref),
});
```

### Two implementations, one export

`Webview.tsx` defines both, and its own header comment is candid about the trade-off:

| Class | Mechanism | Behaviour | Exported to extensions |
| --- | --- | --- | --- |
| `WebviewEmbed` (default export, and what vortex-api calls `Webview`) | Chrome `<webview>` tag | Integrates with the DOM, scrolls and clips like any element, but "doesn't seem to forward all events correctly" — their example is Google Drive's download button | **Yes** |
| `WebviewOverlay` | Electron `WebContentsView`, positioned over a placeholder div | Browser behaviour is better, but it renders as a separate layer on top of everything, cannot be overlaid by other UI, and stays visible until unmounted | No |

So an extension gets the embed variant. That is usually the right one for a page anyway: the
overlay's "draws above all other UI until unmounted" property is exactly what a tabbed page must
not do. The overlay's placement logic (a 1-second interval that hit-tests its own container with
`document.elementFromPoint` and parks the view off-screen when something covers it) shows how
awkward the alternative is.

### Props

`IWebviewProps` — the wrapper's own:

| Prop | Purpose |
| --- | --- |
| `onLoading(loading)` | Fired from `did-start-loading` / `did-stop-loading` |
| `onNewWindow(url, disposition)` | A popup or `target=_blank` link was blocked and handed to you |
| `onFullscreen(fullscreen)` | HTML fullscreen entered/left |
| `events` | Extra event map — honoured by the overlay variant only |

`IWebView` — passed through to the tag: `src`, `style`, `autosize`, `nodeintegration`, `plugins`,
`preload`, `httpreferrer`, `useragent`, `disablewebsecurity`, `partition`, `webpreferences`,
`blinkfeatures`, `disableblinkfeatures`, `guestinstance`. The rendered element always gets
`allowpopups='true'`.

Instance method: `loadURL(url)`. There is no exposed history API — see below.

### Events the control does not wire

`WebviewEmbed` attaches only `did-start-loading`, `did-stop-loading`, `console-message`,
`enter-html-full-screen` and `leave-html-full-screen`, and its `events` prop is dropped. Anything
else — `did-navigate`, `did-navigate-in-page`, `did-finish-load` — you attach yourself to the DOM
node:

```js
const attachEvents = (ref) => {
  const node = ReactDOM.findDOMNode(ref);
  if (node) {
    node.addEventListener('did-navigate', onNavigate);
    node.addEventListener('did-navigate-in-page', onNavigate);
  }
};
```

Core's own `BrowserView.tsx` does precisely this in its `setRef`, and removes the listeners when
the ref goes null. Follow that shape; a listener left on a destroyed guest is a leak.

### Chrome you have to build yourself

Because no history API is exposed, core keeps a `history` array plus a `historyIdx` in component
state, pushes on navigation, and drives back/forward with `loadURL(history[newPos])`. Its
breadcrumb is built by parsing the current URL into path segments. Its spinner is `onLoading`
behind a 100 ms debouncer so a fast load doesn't flicker.

## 3. How a download inside embedded content becomes a Vortex download

This chain already exists in core. Content that triggers a download does **not** need an extension
to intercept anything.

| Step | Where | What happens |
| --- | --- | --- |
| 1 | `MainWindow.ts`, `will-download` on the window's session | `event.preventDefault()`, then `signalUrl(item)` |
| 2 | `signalUrl` | Sends `received-url` to the renderer with the item's URL and filename |
| 3 | Core browser extension's `received-url` listener | If a `browse-for-download` subscriber is active, hands it the URL and closes the modal; otherwise emits `start-download-url` |
| 4 | `startDownloadFromURL` in `renderer.tsx` | Looks up a protocol handler for the URL's scheme |
| 5 | `download_management` | Its `registerProtocol('https', …)` (and `http`) handler emits `start-download` with empty mod info and `install` false |

Consequences to design around:

- **Capture is free.** Embed a page, let the user click the site's own download button, and the
  archive lands in the active game's download folder. No install, no mod type, no attributes.
- **An extension that wants more takes over afterwards** — for example on `did-finish-download`,
  matching the finished download's URL, then emitting `start-install-download` and stamping
  attributes itself.
- `blob:` URLs are the exception: they are saved to the temp folder first and signalled once
  complete, with the filename appended to the URL after a `|`.
- When the core browse modal is open it consumes the URL instead, and appends `<` plus the last
  visited page URL as a referrer hint.

## 4. Popups, navigation, and staying inside the page

- The **main window's** `setWindowOpenHandler` denies popups outright and opens them in the system
  browser; its `will-navigate` does the same for top-level navigation. Vortex's own frame can
  therefore never be navigated away from.
- For **guest webviews**, `MainWindow.ts` listens for `webview-dom-ready` and installs a
  window-open handler on that guest's contents which denies the popup and sends `webview-open-url`
  back to the renderer. That is what surfaces as `onNewWindow`.
- So `onNewWindow` is the decision point for an embedding page: navigate in place with `loadURL`,
  hand the URL to a download, or `util.opn` it to the system browser. Core's modal treats any such
  URL as a download candidate, with a hardcoded exception that keeps `drive.google.com` navigating
  in place.
- Nothing stops in-page navigation to another host. A page that wants to stay on one site must
  watch `did-navigate` and bounce anything off its allow-list.

## 5. Sessions and partitions

The `<webview>` tag with no `partition` attribute uses the default session — the same session whose
`will-download` hook provides the capture chain above. Setting `partition` isolates cookies but
moves the guest to a session that has no such hook, which silently removes download capture.

Core's overlay variant does exactly that on purpose: it creates its view with
`partition: 'persist:webview'`, and the comment explains why — external site cookies (their example
is moddb.com) were being sent to CDN downloads that authenticate with signed URLs.

The two goals conflict. Pick capture or isolation deliberately, and re-test downloads after any
change to `partition`.

## Gotchas

- `Webview` is the embed variant; `WebviewOverlay` is not exported, so plan for the embed's event
  quirks rather than hoping to swap implementations.
- The `events` prop looks general but only the overlay honours it. Use a ref and DOM listeners.
- No history API — track it yourself, or back/forward buttons will do nothing.
- A `partition` silently disables download capture (see §5).
- Embedded content runs on whatever Electron/Chrome version Vortex ships, with no ad blocking, and
  `disablewebsecurity` exists as a prop. Core's confirmation gate is there for a reason; keep an
  equivalent before first load.
- `browse-for-download` resolves an **array**; `result[0]` is the URL. An empty array means the user
  closed the window without downloading.
- Guest listeners must be removed when the ref clears, or they outlive the page.

## See also

`VORTEX_REACT_PAGES.md` (registering the main page that hosts a webview, and the rest of the page
component API). `VORTEX_DOWNLOAD_MGMT.md` (what happens to a URL once `start-download` fires — the
queue, chunked transfer, protocol handlers). `VORTEX_MOD_INSTALL.md` (the install pipeline an
extension hands the finished download to). `DOWNLOADER.md` (the requirements auto-downloader, and
where `browse-for-download` fits among its routes). `NOTIFICATIONS_DIALOGS.md` (the dialog surface
a confirmation gate uses). `THUNDERSTORE_API.md` (a source whose site is browsed this way).
