# template-tfcinstaller-ue2-3

Unreal Engine 2 and 3. Textures live in `.tfc` cache files rather than as loose assets, so texture
mods are applied by the external TFC Installer, which patches `.upk` and `.tfc` files in place.
Vortex therefore stages mods into `TFCInstaller/Mods` rather than into the game.

---

**Toggles:** `has64Bit` drives `BITS`, which sets `BINARIES_PATH` to `Binaries/Win32` or
`Binaries/Win64`.

**Constants:** `EPIC_CODE_NAME` (the project folder in root — also `REQ_FILE`, so discovery keys off
a folder rather than an exe), `COOKED_FOLDER` `CookedPC`, `ROOT_FOLDERS`
`[<code>, 'Engine', 'Binaries']`, `ROOTSUB_FOLDERS`
`['Config', 'CookedPC', 'DLC', 'Localization', 'Movies']`, `COOKEDSUB_FOLDERS` `['Maps', 'Packages']`,
`TFC_FOLDER` `TFCInstaller`, `TFCMOD_PATH` `TFCInstaller/Mods`, `UPKEXPLORER_FOLDER` `UPK Explorer`,
`MOVIES_EXTS` `['.bik']`, `COOKEDSUB_EXTS` `['.upk']`.

`TFCMOD_EXTS` is `['.packagepatch', '.descriptor', '.tfcmapping', '.inipatch']` — **`.tfc` is
deliberately excluded**, because direct-file mods legitimately contain `.tfc` files and would
otherwise be misrouted into the installer's folder. `TFCMOD_FILES` catches the marker files instead:
`gameprofile.xml`, `gameprofile.idremappings.xml`, `objectdescriptors.xml`, `packageextensions.xml`,
`texturepack`, `game`.

| Mod type | Priority | Target |
| --- | --- | --- |
| `TFCMOD_ID` | spec | `TFCInstaller/Mods` |
| `ROOT_ID` | spec | `{gamePath}` |
| `COOKEDSUB_ID` | spec | `<code>/CookedPC` |
| `MOVIES_ID` | spec | `<code>/Movies` |
| `TFC_ID` | spec `low` | `{gamePath}` |
| `UPKEXPLORER_ID` | spec | `{gamePath}` |
| `BINARIES_ID` | spec, plus explicit at 40 | `Binaries/Win<BITS>` |

**Installers:** `TFC` 25 → `UPKEXPLORER` 27 → `TFCMOD` 29 → `ROOT` 31 → `COOKEDSUB` 33 → `MOVIES` 35
→ `BINARIES` 37 → fallback 49.

**Tools:** TFC Installer and UPK Explorer alongside Custom Launch (asset `tfc.png`). `deployNotify`
plus `runModManager` prompt the post-deploy TFC Installer run. TFC Installer downloads from Nexus.
Config and saves sit under `Documents/My Games/<game>/<code>/Config` and `…/SaveData`.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../RUN_EXECUTABLE.md` (`runModManager`, behind the deploy notification).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
