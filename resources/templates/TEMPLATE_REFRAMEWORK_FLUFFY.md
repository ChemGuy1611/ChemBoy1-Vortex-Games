# template-reframework-fluffy

RE Engine (Resident Evil, Monster Hunter, Dragon's Dogma 2). Two unrelated mod ecosystems coexist
and the template supports both at once: Fluffy Mod Manager, which consumes mods as **zip archives**
and applies them itself, and REFramework, a `dinput8.dll` injector that loads loose Lua scripts and
native plugins.

---

**Toggles:** `reZip` (default `true`, and flagged in-file as still required), `useRefNightly` (take
REFramework from the nightly GitHub release rather than the Nexus page), `multiExe` (a separate demo
build with its own Fluffy folder), `hasXbox`. There is no `fallbackInstaller` — the re-zip installer
at 49 is the catch-all.

**Constants:** `FLUFFY_EXEC` `modmanager.exe`, `FLUFFY_PAGE_NO` `818` / `FLUFFY_FILE_NO` `7192` on
the Nexus `site` domain, `REF_FILE` `dinput8.dll`, `REF_URL`
`https://github.com/praydog/REFramework-nightly/releases/latest/download/REFramework.zip`,
`FLUFFYMOD_FILE` `modinfo.ini`, `PRESET_EXTS` `['.prt']`, `CONFIG_FILE` `config.ini`, `REF_FOLDERS`
`['reframework', 'autorun']`, `PLUGIN_FOLDERS` `['reframework', 'plugins']`, and a `ROOT_FILES`
allowlist of engine DLLs (`nvngx_dlss.dll`, `dstorage.dll`, `dstoragecore.dll`,
`amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll`, `libxess.dll`) used to recognise a root-folder mod.

| Mod type | Priority | Target |
| --- | --- | --- |
| `ROOT_ID`, `LOOSELUA_ID`, `FLUFFY_ID`, `REF_ID` | spec | `{gamePath}` |
| `FLUFFYMOD_ID` | 25 | Fluffy mods folder |
| `PRESET_ID` | 40 | Fluffy presets folder |

**Installers:** `FLUFFY` 25 → `REF` 27 → `LOOSELUA` 29 → `ROOT` 31 → `PRESET` 33 → then, at 49,
either `FLUFFYMOD` (when `reZip` is off) or `FLUFFYMOD-zip` (when it is on).

**The re-zip trap.** Fluffy wants a zip; Vortex extracts everything it downloads. `installZipContent`
resolves the conflict: if the extracted staging folder still contains an archive — a double-zipped
mod — those archives are copied through untouched. Otherwise the entire staging folder is repacked
into `<modname>.zip` with `util.SevenZip` and that single file becomes the mod. `testZipContent`
claims everything that is not Fluffy itself and not REFramework, which is what makes it the de facto
fallback.

**Save path** resolves through the registry to
`Steam/userdata/<userId>/<appId>/remote` via `getSavePath`.

**Tools:** Custom Launch, Custom Launch (Demo), Fluffy Mod Manager (asset `fluffy.png`).
`deployNotify` plus `runFluffy`. Extra toolbar actions: Download Latest REFramework Nightly, Open
Config File, Open Save Folder (Steam).

The `spec` carries all five store-ID slots and a `hasXbox` toggle, even though most RE Engine
extensions in practice only fill in Steam.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../ARCHIVE_HANDLER.md` (the re-zip path and `util.SevenZip`).
`../RUN_EXECUTABLE.md` (`runFluffy`).
`../WINAPI_BINDINGS.md` (the registry lookup behind the Steam save path).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
