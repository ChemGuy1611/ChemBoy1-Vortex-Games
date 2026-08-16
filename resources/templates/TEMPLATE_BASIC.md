# template-basic

The reference skeleton, and the checklist for building a new template. It assumes nothing about the
engine: mods go to a `MOD_PATH` folder, optionally through an installer, and everything else is
opt-in.

---

Almost the whole template is toggle-gated, which makes it the clearest illustration of the five
touch points a toggle has to cover — the `spec.modTypes` push, the explicit `registerModType`, the
`registerInstaller` call, the `setup()` download, and the guard inside the gated function.

**Toggles beyond the universal set:** `hasLoader` (a generic `LOADER_FILE` dll injector),
`needsModInstaller` (route ordinary mods through an installer instead of dropping them in
`MOD_PATH`), `rootInstaller`, `saveInstaller` (leave off when saves live outside the game folder),
`multiModPath` (a second mod path for, typically, the Xbox build), and `binariesInstaller`, which is
derived rather than set: it turns itself on only when `BINARIES_PATH !== '.'`.

**Discovery.** `makeFindGame` carries a commented-out `winapi.RegGetValue(INSTALL_HIVE, INSTALL_KEY,
INSTALL_VALUE)` block ahead of the `GameStoreHelper` call, for games that only register themselves
in the registry. Uncomment and fill the three constants.

**Store detection constants.** `STEAM_FILE` (`steam_api64.dll`), `GOG_FILE` (`Galaxy64.dll`),
`EPIC_FILE` (`EOSSDK-Win64-Shipping.dll`), `XBOX_FILE` (`appxmanifest.xml`) — the marker files other
templates probe to tell which store's build is installed.

| Mod type | Priority | Target |
| --- | --- | --- |
| `ROOT_ID` | spec `high` | `{gamePath}` |
| `MOD_ID` | spec `high`, when `needsModInstaller` | `{gamePath}/<MOD_PATH>` |
| `SAVE_ID` | spec `high`, when `saveInstaller` | `{gamePath}/<SAVE_PATH>` |
| `CONFIG_ID` | 60, commented out | `<CONFIG_PATH>` |
| `SAVE_ID` | 62, commented out | `<SAVE_PATH>` |
| `LOADER_ID` | 70, when `hasLoader` | `{gamePath}/<BINARIES_PATH>` |
| `BINARIES_ID` | 72, when `binariesInstaller` | `{gamePath}/<BINARIES_PATH>` |

**Installers:** `LOADER` 25 → `ROOT` 27 → `MOD` 29 → `BINARIES` 31 → (`CONFIG` 33, commented) →
`SAVE` 35 → fallback 49.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../WINAPI_BINDINGS.md` (the commented-out `RegGetValue` discovery fallback).
`../REQUIRES_LAUNCHER.md` (the per-store launcher hand-off).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
