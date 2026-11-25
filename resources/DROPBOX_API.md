# Dropbox Share Links

Some modding tools are only distributed as a public Dropbox share link, such as DAI Mod Manager for Dragon Age: Inquisition. Dropbox has no API for anonymous files. All that is available is the share link and the redirect chain behind it.

| Surface               | URL shape                                                              | Purpose                                 |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Share link (current)  | `https://www.dropbox.com/scl/fi/<id>/<name>?rlkey=<key>&dl=1`          | Permanent public link to one file       |
| Share link (legacy)   | `https://www.dropbox.com/s/<id>/<name>?dl=1`                           | Older format; redirects to the current one |
| Content host          | `https://<token>.dl.dropboxusercontent.com/cd/0/get/<token>/file?dl=1` | Short-lived URL that serves the bytes   |

## Link parameters

- `dl=1` serves the file. `dl=0` (the default when a link is copied from the site) serves the HTML preview page.
- `rlkey=` is required on `/scl/fi/` links. Without it the link does not resolve.
- `st=` is a share-session token that the site appends when a link is copied. It belongs to that browser session and can expire, so drop it.
- `e=` is left over from legacy links and does nothing.

## The redirect chain

Probed live, both link formats pointing at the same file (`ModManager (x64) 1.0.0.59.zip`, 142232 bytes):

```text
Current /scl/fi/ link
  302  text/html          -> https://<token>.dl.dropboxusercontent.com/cd/0/get/<token>/file?dl=1
  200  application/json   Content-Disposition: attachment; filename="ModManager (x64) 1.0.0.59.zip"; filename*=UTF-8''...

Legacy /s/ link
  302  text/html          -> https://www.dropbox.com/scl/fi/<id>/ModManager-x64-1.0.0.59.zip?e=1&rlkey=<key>&dl=1
  302  text/html          -> https://<token>.dl.dropboxusercontent.com/cd/0/inline/<token>/file?dl=1
  302  application/json   -> /cd/0/inline2/<token>/file?dl=1          (relative Location)
  200  application/json   Content-Disposition: attachment; filename=unspecified
```

Things to know about the chain:

- **A legacy link names the file `unspecified`.** It goes through the `inline` path, and the final hop sends a placeholder instead of the file name. The real name is only in the share link's own path (`/s/<id>/<name>`).
- **The final `Content-Type` is not reliable.** It can be `application/json`, `application/binary`, or something else for the same file. It is never `text/html` for a real file. A removed, private, or folder link ends on an HTML page instead.
- **Some hops use a relative `Location`** (`/cd/0/inline2/...`), so resolve each one against the URL that sent it.
- **`HEAD` works across the whole chain** and returns the same `Content-Disposition` as `GET`, so the file name and version can be read without downloading the body.
- **`dl.dropboxusercontent.com` URLs expire.** Never store one. Resolve the share link again each time.

## Why the Vortex download manager can't be used

Vortex 2.x names a finished download from the server's `Content-Disposition` first, then the last segment of the requested URL, then the caller's `fileName` hint (`VORTEX_DOWNLOAD_MGMT.md`, "What names the archive on disk"). For a legacy link, step 1 returns `unspecified`, so the download is saved with that name and no extension. No installer can open it, and nothing the caller passes to `start-download` changes it. Current-format links get a correct name, but a link pasted from an old forum post or readme is usually the legacy kind.

So the file is fetched outside the download manager and handed over with `import-downloads`. That way, the extension chooses the name.

The fetch uses Node's `https` module rather than the renderer's `fetch`. A cross-origin `fetch` cannot read `Content-Disposition` unless the server lists it in `Access-Control-Expose-Headers`, and Dropbox does not. Redirects are followed by hand so that every hop's headers stay readable.

## No version pinning

A share link points at one file, and Dropbox keeps no public history behind it. There is nothing to pin to, so the module has no `pinVersion` field. `DOWNLOADER.md` has the cross-module pinning table.

## Shared dropbox_downloader.js Module

`resources/downloader/dropbox_downloader.js` turns the behavior above into a reusable requirements auto-downloader, the Dropbox counterpart to the GitHub `downloader.js` and the other companion modules (see `DOWNLOADER.md`). Each adopter carries a byte-identical copy next to `index.js`. `template_dropbox_downloader.js` shows how to wire it in. It only depends on Node built-ins and `vortex-api`.

### The requirement object

| Field             | Required | Purpose                                                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `shareUrl`        | yes      | The public share link, in either format. `dl=1` is forced and `st=` dropped automatically                    |
| `userFacingName`  | yes      | Used in notifications, error messages, and as the name shown in the mod list                                 |
| `modType`         | no       | Mod type to set after install. A **dedicated** type also marks installed copies (see below)                  |
| `pageUrl`         | no       | Manual-download page, stamped as the mod's Source link (default: the share link with `dl=0`)                 |
| `fileName`        | no       | Name to save under when neither Dropbox nor the share link's path names the file                             |
| `fallbackVersion` | no       | Version to use when the file name contains none                                                              |
| `versionPattern`  | no       | RegExp whose group 1 is the version, run against the resolved file name (default `/(\d+(?:\.\d+)+)/`)       |
| `autoInstall`     | no       | `false` turns off unattended installs, so only an explicit user action installs it                           |

### Exports

`downloadDropbox`, `checkForDropboxUpdate` (array entry points), `downloadDropboxRequirement`, `checkForDropboxUpdateRequirement`, `isDropboxRequirementInstalled`, `getLatestDropboxFile`, `normalizeDropboxUrl`, `compareVersions`.

### Behaviors worth knowing

- **File name precedence:** the server's `Content-Disposition` name (`filename*` before `filename`, with `unspecified` treated as absent), then the last segment of the share link's path, then the requirement's `fileName`. If none of these is available, the install fails with a message naming the field to set.
- **Installed copies** are mods carrying the `dropboxShareUrl` attribute with the requirement's normalized link, or mods of the requirement's `modType` when it sets one. The `modType` match also recognizes copies that an extension installed before it adopted the module. Only set `modType` to a type no ordinary mod shares, or every mod of that type counts as the requirement.
- **Versions** come from the resolved file name and are compared segment by segment as numbers (`1.0.0.59`), with missing segments counting as `0`. A file name without a dotted number has no version, and the update check then stays silent.
- **The update check makes one `HEAD` chain.** It raises a notification only when the file behind the link has been replaced with one whose name carries a higher version.
- **No download-progress bar.** The transfer happens inside the extension, so the file only appears in the Downloads list once it is complete. Files on Dropbox are typically small tools, so this is acceptable.
- **The download is written to a `.part` file in a per-run temp folder** and renamed once complete. The folder is removed whether or not the install succeeds.
- **Attributes stamped:** `version`, `dropboxShareUrl`, `source: 'website'`, `url` (the page), `customFileName` (the `userFacingName`), and `modId` / `fileId` cleared, so a false Nexus md5 match cannot attach an unrelated update.
- **An update disables the copy it replaces** in the same batch that enables the new one.
- **Only one install runs at a time per share link.** A second request while one is running is dropped.

## See also

`DOWNLOADER.md` (the GitHub requirements auto-downloader, the shared local-copy model, and the cross-module version-pinning table). `VORTEX_DOWNLOAD_MGMT.md` (how Vortex names a download, the reason this module cannot hand the link to `start-download`, and the `import-downloads` event it uses instead). `RAZEDMODS_API.md` (the module this one is modelled on: the same lean shape and segment-wise version compare, on a host whose redirect carries the version). `NODE_FS.md` (the `fs` surface the download is written through). `VORTEX_MOD_LIST.md` (the `customFileName` rule that decides which name a requirement is shown under).
