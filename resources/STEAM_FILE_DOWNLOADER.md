# Steam File Downloader (SteamKit) Extension

Reference for the third-party "Vortex Steam File Downloader" extension — the Steam file-integrity
verification and Workshop-download service that game extensions consume through
`api.ext.steamkitVerifyFileIntegrity`.

---

## 1. What it is

| Property | Value |
| --- | --- |
| Nexus page | [nexusmods.com/site/mods/409](https://www.nexusmods.com/site/mods/409) |
| Extension name (for `requireExtension`) | `Vortex Steam File Downloader` |
| Internal package name | `steamkit` |
| Author | Nagev (IDCs) |
| Current version | 0.2.2, released 2023-03-23 — unchanged since |
| JS side | [Nexus-Mods/extension-steamkit](https://github.com/Nexus-Mods/extension-steamkit) |
| Native side | [IDCs/DepotDownloader](https://github.com/IDCs/DepotDownloader) — a fork of SteamRE/DepotDownloader |
| Install location | `<Vortex plugins dir>\Vortex Extension Update - Vortex Steam File Downloader v0.2.2\` |

It is **not bundled** with Vortex. The user must install it from the Extensions page (or from the
Nexus site page) before any extension that depends on it will work.

The extension provides three separate things:

1. A **"Verify Files"** toolbar button on the Mods page for any Steam game.
2. A **Steam Workshop** browser page (needs a user-supplied Steam Web API key).
3. A **developer API**, `api.ext.steamkitVerifyFileIntegrity`, that lets a game extension trigger
   the verification flow itself.

Only the third is relevant to most game extensions, and it is what the rest of this document covers.

---

## 2. Architecture

```text
game extension                   steamkit extension (JS)             DepotDownloaderIPC.exe (.NET 6)
--------------                   -----------------------             -------------------------------
api.ext.steamkitVerify... --->   verifyFilesWrap()
                                   |- verifyIsSteamGame()
                                   |- purge-mods
                                   |- Core delegates (Context/UI)
                                   `- sendMessage('VerifyFiles')  --> Server.DispatchIntegrityVerification
                                          named pipe / TCP                 |- Exec.VerifyFileIntegrity
                                                                           |- SteamKit2 login
                                                                           |- fetch depot manifests
                                                                           |- hash local files
                                   MismatchDialog  <-- ReportMismatch <----|- compare
                                   selected paths  --> reval ------------->|- download replacements
```

The native half ships as a self-contained .NET 6 build (`dist\` carries `coreclr.dll`,
`hostfxr.dll`, `System.Private.CoreLib.dll`), so **no separate .NET runtime install is required**,
despite the "you need .Net framework 6.0 or newer" message the JS side prints if the process exits
with `0x80131700`.

Transport is a Windows named pipe by default, with a fallback to a `localhost` TCP socket if the
pipe fails. Messages are JSON delimited by `￿`.

The Steam session lives in **static** C# state and is deliberately *not* shut down after an app
verification run, so credentials survive for the rest of the Vortex session and a second verify does
not re-prompt. Restarting Vortex re-prompts. If the session sits idle too long, the C# side calls
back into the `timedOut` UI delegate, which offers a "Try Again" button that re-emits
`steamkit-restart`.

---

## 3. The developer API

```js
context.requireExtension('Vortex Steam File Downloader');

api.ext.steamkitVerifyFileIntegrity(parameters, gameId, callback);
```

### 3.1 It is a callback API, not a promise API

This is the single most common integration mistake. Vortex's `registerAPI` stores the registered
function **raw** on `api.ext` (`ExtensionManager.ts`: `this.mApi.ext[key] = func`). There is no
promisification layer. The steamkit registration is:

```ts
context.registerAPI('steamkitVerifyFileIntegrity',
  (parameters, gameId, callback) => { verifyFilesWrap(parameters, gameId, callback); },
  { minArguments: 2 });
```

The registered arrow function does not return the inner promise, so the call **returns `undefined`**.
Consequently:

```js
// WRONG - resolves immediately, never throws, and the catch block is dead code.
try {
  await api.ext.steamkitVerifyFileIntegrity(parameters, GAME_ID);
  log('info', 'verification complete');   // fires while verification is still starting up
} catch (err) {
  // unreachable
}
```

```js
// CORRECT - wrap the third-argument callback.
await new Promise((resolve, reject) =>
  api.ext.steamkitVerifyFileIntegrity(parameters, GAME_ID,
    (err) => (err ? reject(err) : resolve())));
```

The callback fires with `null` on success, or with an `Error` for the three failure paths the JS
wrapper handles: not a Steam game, purge failed, and verification failed. Note that the wrapper
already shows its own notification for each of those before invoking the callback, so a caller
should not show a second error notification for the same failure unless it wants a
game-specific message.

`minArguments: 2` is declared in the registration options but current Vortex ignores the field, so
it enforces nothing.

### 3.2 `ISteamKitParameters`

```ts
export interface ISteamKitParameters {
  Username?: string;
  Password?: string;
  RememberPassword?: boolean;
  ManifestOnly?: boolean;
  CellId?: number;

  // Files need to be separated by /r or /n
  FileList?: string;
  InstallDirectory?: string;
  VerifyAll?: boolean;
  MaxServers?: number;
  MaxDownloads?: number;
  LoginId?: number;

  // Steam app id
  AppId?: number;

  PubFile?: string;
  UgcId?: string;
  Branch?: string;
  BetaBranchPassword?: string;
  DepotIdList?: number[];
  ManifestIdList?: number[];
}
```

| Field | Default | What it actually does |
| --- | --- | --- |
| `AppId` | — | **Required.** Steam app id as a number. Missing/unparseable aborts with "SteamAppId not specified". |
| `InstallDirectory` | — | **Required in practice.** The game's discovery path. Used as the download target *and* as the string stripped off `FileList` entries to derive manifest-relative names. |
| `FileList` | walked from disk | Newline- or CR-separated list of **absolute paths of local files to hash**. See §4 — this is not a download filter in the way the upstream project's `-filelist` is. |
| `VerifyAll` | `false` | Must be `true` whenever `FileList` is supplied. See §4.3. |
| `ManifestOnly` | `false` | Writes `manifest_<depotId>_<manifestId>.txt` into `InstallDirectory`. It does **not** suppress downloading in this fork. Leaving it `false` avoids littering the game folder. |
| `DepotIdList` | installed depots | Omit it and the extension reads `AppState.InstalledDepots` out of the game's Steam `appmanifest`, which is what you want in almost all cases. |
| `ManifestIdList` | none | If supplied, must have exactly the same length as `DepotIdList`. |
| `Branch` | `public` | Steam branch. `BetaBranchPassword` goes with it. |
| `Username` / `Password` | prompted | Leave unset. The C# side prompts through the UI delegate (login dialog, Steam Guard, 2FA). |
| `RememberPassword` | `false` | Declared but effectively unused; Vortex does not persist Steam credentials. |
| `MaxServers` / `MaxDownloads` | 20 / 8 | CDN parallelism. `MaxServers` is raised to at least `MaxDownloads`. |
| `CellId`, `LoginId` | 0 / `0x534B32` | Leave unset. |
| `PubFile` / `UgcId` | — | Workshop download mode, not file verification. Setting either takes a completely different code path. |

---

## 4. How `FileList` really works

The fork changed the meaning of the file list relative to upstream DepotDownloader, and the change
is not documented anywhere on the Nexus page. Getting this wrong is the difference between a working
integration and a silent no-op.

### 4.1 The entries are local absolute paths that get opened and hashed

`ProtoManifest.FileData` has a constructor that takes a path and immediately reads the file:

```csharp
public FileData(string filePath)
{
  string fPath = filePath.Replace('/', '\\');
  string relPath = fPath.Replace(ContentDownloader.Config.InstallDirectory, "");
  FilePath = fPath;
  FileName = relPath.Substring(1);          // manifest-relative name
  Flags = 0;
  using (FileStream filestream = File.Open(filePath, FileMode.Open))
  {
    filestream.Position = 0;
    FileHash = Util.SHAHash(filestream);
  }
}
```

Three consequences:

- **Paths must be absolute**, and must start with `InstallDirectory`. A bare `"toc"` or a relative
  `"Data\\file.pak"` resolves against the `DepotDownloaderIPC.exe` process working directory, not
  the game folder.
- **Every listed file must exist.** `File.Open(..., FileMode.Open)` throws `FileNotFoundException`
  for a missing one. Do not list a file you have just deleted.
- The relative name is derived by plain string `Replace`, so the `InstallDirectory` you pass and the
  paths you list must use identical casing and separators.

### 4.2 Omitting `FileList` walks the whole game directory

If `FileList` is absent, `Server.DispatchIntegrityVerification` fills it in:

```csharp
if (data["FileList"]?.ToString() == null)
{
  var fileList = await coreDelegates.context.GetGameFileList();
  data["FileList"] = string.Join('\n', fileList);
}
```

`GetGameFileList` turbowalks the discovery path (excluding the game's mod path) and returns absolute
paths. **This call has a hard 5-second timeout** (`Defaults.TIMEOUT_MS`); `Util.Timeout` throws
`TimeoutException` past it, which surfaces as a "File integrity checks failed" notification. On a
large install on a slow disk this is a real failure mode, and it is the main reason to supply an
explicit, short `FileList`.

### 4.3 `VerifyAll: true` is mandatory alongside `FileList`

The same `Config.FilesToDownload` set is consumed by a second, unrelated function:

```csharp
static bool TestIsFileIncluded(string filename)
{
  if (!Config.UsingFileList || Config.VerifyAll)
    return true;

  filename = filename.Replace('\\', '/');
  if (Config.FilesToDownload.Contains(filename)) return true;
  foreach (var rgx in Config.FilesToDownloadRegex) { if (rgx.Match(filename).Success) return true; }
  return false;
}
```

`TestIsFileIncluded` receives **manifest-relative** names, but §4.1 requires the list to hold
**absolute** paths. The two uses are mutually incompatible: with `VerifyAll: false` nothing ever
matches, the candidate download set comes out empty, and no file is restored even after the user
ticks it in the mismatch dialog. `VerifyAll: true` short-circuits the filter to `true` for every
file and makes the list mean only "files to hash". The extension's own toolbar action sets
`VerifyAll: true` for exactly this reason.

An entry prefixed with `regex:` is compiled into `FilesToDownloadRegex` instead of the plain set —
but since `VerifyAll: true` bypasses the regex filter and the `FileData` constructor would try to
open the literal `regex:...` string as a path, regex entries are not usable here.

### 4.4 Missing files are detected regardless of the list

```csharp
return filesData.FindAll((file) =>
{
  if (data.Where(d => d.FileName == file.FileName).FirstOrDefault() == null)
  {
    // manifest file that is NOT in the supplied list: flag it only if it is truly absent
    string expectedPath = Path.Combine(Config.InstallDirectory, file.FileName);
    bool fileExists = File.Exists(expectedPath) || Directory.Exists(expectedPath);
    ...
    return !fileExists && !isDirectory;
  }
  // manifest file that IS in the list: flag it if the hashes differ
  FileData mismatch = data.Where(gameFile => (gameFile.FileName == file.FileName)
                                          && (!gameFile.FileHash.StructuralEquals(file.FileHash))).FirstOrDefault();
  return mismatch != null;
});
```

So a targeted `FileList` gives you: **hash checking for the listed files, plus missing-file detection
for the entire depot**. That is the useful shape for an extension that wants to restore one or two
specific files it deleted — list a small file that definitely still exists, and let the
missing-file branch catch the deleted ones. Files that exist but are tampered and are *not* listed
are silently passed over.

Manifest entries with no file extension are skipped by the check
(`filesData.Where(f => Path.HasExtension(Path.GetFileName(f.FileName)))`), so an extensionless file
such as Insomniac's `toc` is never hash-compared — only its absence is detectable.

---

## 5. What a verification run actually does

1. `verifyIsSteamGame` — resolves the app id through `util.GameStoreHelper.findByAppId([AppId], 'steam')`
   and compares the resulting path against the game's discovery path. A mismatch (an Epic/GOG/Xbox
   copy, or a Steam copy discovered at a different path) shows the "Must be a Steam game" warning and
   calls back with an error.
2. **Purge.** `api.events.emit('purge-mods', true, ...)` runs unconditionally, so deployed links do
   not get counted as tampered files. Purge failure aborts the run.
3. Spawns/reuses `DepotDownloaderIPC.exe` and sends the `VerifyFiles` command.
4. C# logs into Steam, prompting for username/password, then Steam Guard or 2FA as required, through
   the UI delegates. There is a 60-second window on user-input dialogs.
5. Fetches each depot manifest, hashes the listed local files, builds the mismatch list.
6. Calls `reportMismatch`, which opens the `mismatched-files-dialog`. The user ticks which files to
   restore; the selection comes back as `reval`.
7. Files not selected are dropped from the download set; the selected ones are downloaded and written
   over the originals.
8. `finally`: dismisses the progress notification, shows a success notification listing the restored
   files, and dispatches `actions.setDeploymentNecessary(gameId, true)`.

Step 8 is worth noting — **the extension purges but never re-deploys.** After a verify run the user
is left with mods purged and a pending-deployment state. A game extension that calls the API should
either deploy afterwards or tell the user to.

---

## 6. Game-spec hooks

The toolbar button's visibility is driven off the game spec:

```js
// visible when either of these resolves
game?.details?.steamAppId      // canonical
game?.environment?.SteamAppId  // legacy fallback (note the casing difference from the
                               // parameters block, which reads environment.steamAppId)

// suppress the button for a game that should not offer Steam verification
details: { hideSteamKit: true }
```

`hideSteamKit` is the only opt-out. There is no opt-in — every registered game carrying
`details.steamAppId` gets the button once the user installs the extension.

The `Context` delegate's `getSteamId` reads `details.SteamAPPId` / `environment.SteamAPPId` (that
exact casing) and will not find the conventional `steamAppId`. It is unused by the verification path
— depot resolution goes through `getDepotIds`, which does a case-insensitive key lookup — so this
does not break anything in practice.

---

## 7. Integration recipe

```js
const STEAMAPP_ID = "2651280";
const GAME_ID = "mygame";

function applyGame(context, gameSpec) {
  // Hard dependency: without `optional`, Vortex unloads THIS extension entirely when the
  // Steam File Downloader is not installed. Pass `true` as the third argument to make it
  // a soft dependency that only prompts the user.
  context.requireExtension('Vortex Steam File Downloader', undefined, true);
  // ...
}

async function verifyGameFiles(api) {
  const GAME_PATH = getDiscoveryPath(api);
  const state = api.getState();

  // The extension refuses non-Steam copies anyway, but checking first avoids the
  // "Must be a Steam game" warning on Epic/GOG installs.
  if (state.settings.gameMode.discovered?.[GAME_ID]?.store !== 'steam') {
    return api.showErrorNotification('Steam verification unavailable',
      'This feature only works with the Steam version of the game.', { allowReport: false });
  }

  const parameters = {
    // absolute path(s), files that exist; anchors the hash check
    FileList: path.join(GAME_PATH, EXEC),
    InstallDirectory: GAME_PATH,
    VerifyAll: true,     // required whenever FileList is set
    AppId: +STEAMAPP_ID,
  };

  try {
    await new Promise((resolve, reject) =>
      api.ext.steamkitVerifyFileIntegrity(parameters, GAME_ID,
        (err) => (err ? reject(err) : resolve())));
  } catch (err) {
    // the extension has already shown its own notification for this failure
    log('warn', 'Steam file verification failed', err.message);
    return;
  }

  // the extension purged and never re-deployed
  return new Promise((resolve, reject) =>
    api.events.emit('deploy-mods', (err) => (err ? reject(err) : resolve())));
}
```

To restore a file the extension deliberately deleted, delete it **and leave it out of `FileList`** —
§4.4's missing-file branch catches it.

---

## 8. Constraints and gotchas

| Issue | Detail |
| --- | --- |
| Callback, not promise | `await api.ext.steamkitVerifyFileIntegrity(p, id)` resolves instantly and never rejects. Wrap the third argument. See §3.1. |
| `requireExtension` is hard by default | Omitting the third `optional` argument means the whole game extension is unloaded with a "dependency" load failure if the user has not installed the Steam File Downloader. |
| Absolute paths only | A relative `FileList` entry throws `FileNotFoundException` inside the native process. See §4.1. |
| Never list a deleted file | Same failure. Rely on the missing-file branch instead. |
| `VerifyAll` must be `true` with `FileList` | Otherwise the download set is empty and nothing is restored. See §4.3. |
| 5-second walk timeout | Omitting `FileList` on a large install can time out `GetGameFileList`. See §4.2. |
| Silent native failures | `Exec.VerifyFileIntegrity` wraps the app-download path in `try { ... } catch (Exception ex) { }` and returns an empty result dictionary. An exception thrown while hashing therefore surfaces as a *successful* run that did nothing. |
| Steam login required every session | Username, password, and Steam Guard / 2FA, entered into Vortex dialogs. Credentials are not stored, but the session is reused until Vortex restarts. |
| Purge without deploy | The run purges mods and only sets `deploymentNecessary`. Re-deploy yourself. |
| `ManifestOnly` writes into the game folder | `manifest_<depotId>_<manifestId>.txt` in `InstallDirectory`. Harmless but untidy, and it does not suppress downloads. |
| Steam-only, and path-matched | The Steam library path must equal the discovery path exactly (after lowercase/separator normalisation). |
| Windows-focused | `createIPC` hard-codes `DepotDownloaderIPC.exe` and prefers a Windows named pipe. |
| Frozen upstream | 0.2.2 has been unchanged since March 2023. Neither repo has open issues or a README. Treat the behaviour above as the contract; it is not going to be fixed. |

---

## 9. See also

`REGISTER_GAME.md` (`details.steamAppId` and the `hideSteamKit` flag read here).
`VORTEX_DEPLOYMENT.md` (the purge this triggers, and the `deploymentNecessary` flag it leaves set).
`NOTIFICATIONS_DIALOGS.md` (the login / Steam Guard / mismatch dialogs the UI delegates raise).
`TOOLBAR_ACTIONS.md` (the `mod-icons` group the "Verify Files" button registers into).
`UNDERUSED_API_FUNCTIONS.md` (`registerAPI` / `api.ext` inter-extension calls in general).
`ERROR_CLASSES.md` (`util.ProcessCanceled` and `util.UserCanceled`, which the delegates raise on
cancel).
