# template-reloaded2

The Reloaded-II framework. A Reloaded mod is a folder containing `modconfig.json`, living under
`Reloaded/Mods`; the mod loader is itself one of those folders; and the Reloaded-II manager needs
administrator rights to hook the game process.

---

**Constants:** `RELOADED_PATH` `Reloaded`, `RELOADED_EXEC` `reloaded-ii.exe`, `RELOADEDMOD_PATH`
`Reloaded/Mods`, `RELOADEDMOD_FILE` `modconfig.json`, `MOD_LOADER_FOLDER` `<game>_Mod_Loader`,
`RELOADEDMODLOADER_PATH` `Reloaded/Mods/<game>_Mod_Loader`, `RELOADEDMODLOADER_FILE`
`<game>.modloader.dll`, `SAVE_FOLDER` `gamedata/savedata`, and the two elevation constants:
`ELEVATOR_PATH` = `util.getVortexPath('application')/resources` and `ELEVATOR_EXEC` `elevate.exe`.

| Mod type | Target |
| --- | --- |
| `RELOADEDMOD_ID` | `Reloaded/Mods` |
| `RELOADEDMODLOADER_ID` | `Reloaded/Mods/<game>_Mod_Loader` |
| `RELOADED_ID` | `{gamePath}`, spec `low` |
| `SAVE_ID` | `gamedata/savedata/<userId>` |

**Installers:** `RELOADED` (manager) 25 → `RELOADEDMODLOADER` 27 → `RELOADEDMOD` 29 → fallback 49.

**Elevated launch.** `runReloadedAdmin` does not run `reloaded-ii.exe` directly. It calls
`api.runExecutable` on Vortex's own bundled `elevate.exe`, passing the Reloaded-II path as the single
argument, with `detached: true`. Anything that skips the elevator fails to hook the game.

**No `allowSymlinks` toggle** — this family is hardlink-only, so the option is not offered.

**`setupNotification` defaults to `true`**: the Reloaded-II Mod Manager setup steps are needed on
every game in the family. `deployNotify` covers the post-deploy manager run. Extra toolbar action:
Download Reloaded Mod Manager. Asset `reloaded.png`.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../RUN_EXECUTABLE.md` (`api.runExecutable` and the `elevate.exe` indirection).
`../NTFS_LINKS.md` (why this family is hardlink-only).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
