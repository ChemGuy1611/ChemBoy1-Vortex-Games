# template-shinryu

Shin Ryu Mod Manager (SRMM), used by the Yakuza / Like a Dragon titles. The distinguishing structural
fact is that the moddable game tree is nested: everything lives under `runtime/media`, not the
install root.

---

**Constants:** `TOPLEVEL_FOLDER` `runtime/media` — `ROOT_PATH`, `MODMANAGER_PATH`,
`MODMANAGERMOD_PATH` (`runtime/media/mods`) and `DATAMOD_PATH` (`runtime/media/data`) are all built
from it. `MODMANAGER_EXEC` `shinryumodmanager.exe` on the Nexus `site` domain,
`MODMANAGERMOD_FILES` `['mod-meta.yaml', 'modinfo.ini']`, `DATAMOD_EXTS` `['.par']`, `DEV_STRING`
`Sega`, `CONFIG_PATH` `%APPDATA%\Sega\<game>\<config folder>` with `SAVE_FOLDER` pointing at the same
place, `ROOT_FILES` an engine-DLL allowlist (`nvngx_dlss.dll`, `dstorage*.dll`, `amd_*`,
`libxess.dll`).

`hasUserIdFolder` defaults to `true` here — the only template where it does.

| Mod type | Target |
| --- | --- |
| `ROOT_ID` | `runtime/media` |
| `MODMANAGERMOD_ID` | `runtime/media/mods` |
| `DATAMOD_ID` | `runtime/media/data` |
| `MODMANAGER_ID` | `runtime/media`, spec `low` |

**Installers:** `MODMANAGER` 25 → `MODMANAGERMOD` 27 (behind `needsModInstaller`) → `DATAMOD` 29 →
`ROOT` 27 (behind `rootInstaller`). There is no fallback installer.

**Priority collision to watch.** `MODMANAGERMOD` and `ROOT` both register at 27, and `ROOT` is
registered *after* `DATAMOD` in source order. With equal priority the registration order decides
which is tested first, so changing the order of those `registerInstaller` lines silently changes
which installer claims an ambiguous archive.

**Tools:** `Launch Modded Game` (SRMM with `parameters: ['--run', '--silent']`, `defaultPrimary`),
the Shin Ryu MM UI (asset `modmanager.png`), and `Launch (No Mods)` pointing at the game exe
directly. `deployNotify` offers a Run SRMM button. `resolveGameVersion` reads `appxmanifest.xml` on
Xbox and the exe elsewhere.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../RUN_EXECUTABLE.md` (`runModManager` and the SRMM launch parameters).
`../REQUIRES_LAUNCHER.md` (the Xbox `appExecName` hand-off).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
