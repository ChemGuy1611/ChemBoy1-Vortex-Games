# template-unity-umm

Unity with Unity Mod Manager. The template fetches UMM from Nexus and reproduces UMM's own
DoorstopProxy patch as installer instructions, so the loader deploys and purges like any other mod.
It used to delegate all of that to Vortex's bundled `modtype-umm` extension; that extension no
longer works (its version table stops at 0.24.2 and matches archives by exact file name, it demands
a premium account, and its mod type is registered without a deploy path), so nothing here calls
`requireExtension` any more. The loader's own mechanics — distribution, file set, config formats —
are in `../UNITY_MOD_MANAGER.md`.

---

## Getting UMM

`downloadUmm()` follows the inline-Nexus route: `api.ext.nexusGetModFiles('site', 21)`, newest file
with `category_id === 1`, falling back to `UMM_FILE_NO` when the file list can not be read, then
`start-download` and `start-install-download`. UMM publishes no GitHub releases at all, so
`downloader.js` is not an option. Gated by `autoDownloadUmm`, called from `setup()`.

`isUmmInstalled()` answers from two sources: a mod of type `UMM_ID` in state, or `UMM_MARKER`
(`<data>/Managed/UnityModManager/UnityModManager.dll`) on disk. The state check matters because the
marker only appears after a deploy.

## Installing UMM

`installUmm()` turns one archive into three sets of instructions:

| What | Destination |
| --- | --- |
| The whole `UnityModManagerInstaller` folder, verbatim | `UnityModManagerInstaller/` |
| `winhttp_<arch>.dll` | `winhttp.dll` |
| Manager libraries | `<data>/Managed/UnityModManager/` |
| Generated `doorstop_config.ini` | game folder |
| Generated `Config.xml` | `<data>/Managed/UnityModManager/` |

Points worth keeping when adapting it:

- **The installer folder is kept** so `UnityModManager.exe` stays usable as a registered tool. That
  is what keeps UMM's own Mods tab and its `Assembly` install type reachable.
- **`Config.xml` is parsed, not hardcoded.** `readUmmGameInfo()` reads the archive's
  `UnityModManagerConfig.xml`, picks the `<GameInfo Name="...">` block named by `UMM_GAME_NAME`, and
  `xml2js`'s `Builder` re-serialises it with `Config` as the root element.
- **UMM's library conditionals are reproduced.** `System.Xml.dll` is skipped when the game already
  ships one in `<data>/Managed`, and `Harmony/2.2/0Harmony.dll` replaces the root `0Harmony.dll`
  only when the parsed `GameInfo` declares `HarmonyVersion` `2.2`.
- **Archive shape is normalised**, so a flat archive installs the same way as one wrapped in
  `UnityModManagerInstaller/`.

`writeUmmParams()` merges a `GameParam` for the game into `%LOCALAPPDATA%\UnityModManagerNet\
Params.xml` — merged, never overwritten, because that file is shared with every other UMM game on
the machine — and `setUmmRegistry()` writes the two `HKEY_CURRENT_USER\Software\UnityModManager`
values. Both are gated by `seedUmmParams` and make the tool open already pointed at the game.

## Mods

Both loaders read from `<gamePath>/Mods/<ModName>`, so there is one `Mod` mod type and two
installers that differ only in the manifest they key on:

| Installer | Manifest | Folder name comes from |
| --- | --- | --- |
| `UMM_MOD_ID` | `info.json` (case-insensitive) plus a `.dll` | the wrapping folder, or the manifest's `Id` |

`modsFolderInstructions()` rebuilds every archive shape — `Mods/<Name>/...`, a bare `<Name>/...`, or
flat — into a single `<Name>/` folder, which is what drops a leading `Mods` segment without
producing `Mods\Mods\<Name>`.

Railloader is not part of this template. `game-railroader` is the only game with a second loader,
so its Railloader constants, installers and "Get Railloader" action live in that extension alone.
The loader binary can not be downloaded either (see `../RAILLOADER.md`). A game that needs a second
loader ahead of UMM has installer slots 23 and 29 free for it.

---

**Constants:** `GAME_STRING` (drives both `<GAME_STRING>.exe` and `<GAME_STRING>_Data`),
`UNITY_BUILD` (`'mono'` / `'il2cpp'`), `UNITY_ARCH` (picks the `winhttp_<arch>.dll` payload),
`UMM_GAME_NAME` (**the `<GameInfo Name>` to select — not the game's display name**), `UMM_DOMAIN` /
`UMM_PAGE_NO` / `UMM_FILE_NO` (the Nexus route), `UMM_FOLDER` `UnityModManagerInstaller`,
`UMM_MANAGER_FOLDER` `UnityModManager`, `UMM_MARKER`, `MODS_FOLDER` `Mods`, `ASSETS_EXTS`
`['.assets', '.resource', '.ress']`, and `DEV_REGSTRING` / `GAME_REGSTRING` for the LocalLow config
path.

**Toggles:** `autoDownloadUmm` (default on), `seedUmmParams` (default on).

| Mod type | Priority | Target |
| --- | --- | --- |
| `UMM_ID` | 8 | `{gamePath}` |
| `MODS_ID` | 10 | `{gamePath}/Mods` |
| `ROOT_ID` | spec | `{gamePath}` |
| `ASSEMBLY_ID` | 60 | `<data>/Managed` (mono) or `.` (IL2CPP) |
| `ASSETS_ID` | 62 | `<data>` |

The assembly and assets types are registered explicitly rather than through `spec.modTypes` because
`DATA_FOLDER` can differ per store build and their paths are recomputed at runtime. `UMM_MARKER` and
the manager path are recomputed alongside them.

**Installers:** `ROOT` 8 → `RAILLOADER` 23 → `UMM` 25 → `UMM_MOD` 27 → `RAILLOADER_MOD` 29 →
`ASSEMBLY` 31 → `ASSETS` 33 → fallback 49. `ROOT` sits below the normal band so it is tested first.

Extra toolbar actions: Run Unity Mod Manager, Get Railloader, Open Mods Folder, Open Data Folder.
No `deployNotify` — UMM applies mods at game launch.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../UNITY_MOD_MANAGER.md` (the loader itself: Nexus-only distribution, the DoorstopProxy file set,
`Params.xml`, and the `info.json` mod format).
`../RAILLOADER.md` (the second loader Railroader mods use, sharing UMM's `Mods` folder).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above, and the
`generatefile` instruction used for `doorstop_config.ini` and `Config.xml`).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
`../FILE_PARSING.md` (`xml2js` `parseStringPromise` and `Builder`).
`../WINAPI_BINDINGS.md` (`RegSetKeyValue`, behind `setUmmRegistry()`).
`../NEXUS_MODS_API.md` (`nexusGetModFiles` and the `category_id` filter behind the download route).
