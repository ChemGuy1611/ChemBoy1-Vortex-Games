# template-farcry

Far Cry / Dunia Engine. Mods are patches to packed `.dat`/`.fat` archives, applied by the external
FC Mod Installer. Vortex stages mod payloads into the installer's own folder; the installer does the
patching.

---

**Constants:** `FC` (the game's short code, used to build URLs), `BIN_PATH` `bin`, `DATA_PATH`
`data_win32`, `MI_PATH` `FCModInstaller`, `MI_FILE` `fcmodinstaller.exe`, `MI_URL`
`https://downloads.fcmodding.com/files/FCModInstaller.zip`, `MIMOD_FOLDER` `ModifiedFilesFC<code>`,
`MIMOD_PATH` `FCModInstaller/ModifiedFilesFC<code>`, `SAVEMANAGER_EXEC`
`FCModInstaller/FCSavegameManager.exe`, `DB_URL` `https://mods.farcry.info/<code>`, `XML_FILE`
`gamerprofile.xml`.

| Mod type | Target |
| --- | --- |
| `ROOT_ID` | `{gamePath}` |
| `BIN_ID` | `bin` |
| `DATA_ID` | `data_win32` |
| `MI_ID` | `FCModInstaller` |
| `MIMOD_ID`, `MIMODA3_ID` | `FCModInstaller/ModifiedFilesFC<code>` |
| `XML_ID` | absolute `Documents/My Games/<Far Cry N>/<userId>` |

**Installers:** `MI` 25 → `ROOT` 27 → `DATA` 29 → `BIN` 31 → `MIMODA3` 33 → `MIMOD` 35 → `XML` 37 →
fallback 49.

**The `.a3` repack trap.** FC Mod Installer mods ship as `.a2`, `.a3`, `.a4`, `.a5`, or `.bin`
containers. Vortex recognises a naked `.a3` as an archive and forcibly extracts it, so by the time
the installer sees the file list, the container is gone and only its XML contents remain.
`testMiModA3` detects exactly that shape, and `installMiModA3` repacks the whole staging folder back
into a fresh `<modname>.a3` with `util.SevenZip` before returning a single copy instruction. The
plain `MIMOD` installer at 35 handles containers Vortex left intact.

**`setupNotification` defaults to `true`** — FC Mod Installer usage instructions apply to every game
in the family, so they always fire. `deployNotify` plus `runModManager` cover the post-deploy step.

**Tools:** Custom Launch, FC Mod Installer, FC Save Manager (assets `modinstaller.png`,
`savemanager.png`). Extra toolbar actions: Open Far Cry Mods Site, Open Far Cry Mod Installer Site.
The user-ID folder used by the save and config paths is resolved during `setup()`.

**Bundled modules:** `fcmodding_downloader.js` keeps the FC Mod Installer installed and up to date,
and `fcmodding_browser.js` + `base_browser.js` register a "Browse Far Cry Mods" page that embeds
`downloads.fcmodding.com/<code>/` so mods can be browsed and installed without leaving Vortex. The
page is behind the `fcmoddingBrowser` toggle and takes one config field, `fcGame`, which is the
existing `FC` code. The Open Far Cry Mods Site action is unaffected: `mods.farcry.info` indexes mods
posted in the FCModding Discord, which is not a download route.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../WINAPI_BINDINGS.md` (the Ubisoft Connect registry probe).
`../REQUIRES_LAUNCHER.md` (the Ubisoft Connect hand-off).
`../RUN_EXECUTABLE.md` (`runModManager`, behind the deploy notification).
`../FCMODDING_API.md` (the host both bundled modules talk to).
`../BROWSER_MODULES.md` (the browse-page family `fcmodding_browser.js` belongs to).
`../ARCHIVE_HANDLER.md` (why Vortex treats a naked `.a3` as an archive).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
