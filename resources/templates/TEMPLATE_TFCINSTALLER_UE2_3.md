# template-tfcinstaller-ue2-3

Unreal Engine 2 and 3. Textures live in `.tfc` cache files rather than as loose assets, so texture
mods are applied by the external TFC Installer, which patches `.upk` and `.tfc` files in place.
Vortex therefore stages mods into `TFCInstaller/Mods` rather than into the game.

---

**Toggles:** `has64Bit` drives `BITS`, which sets `BINARIES_PATH` to `Binaries/Win32` or
`Binaries/Win64`. `upkFolderPicker` (default off) turns on the `.upk` install folder picker described
below.

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

| Mod type         | Priority                  | Target               |
| ---------------- | ------------------------- | -------------------- |
| `TFCMOD_ID`      | spec                      | `TFCInstaller/Mods`  |
| `ROOT_ID`        | spec                      | `{gamePath}`         |
| `COOKEDSUB_ID`   | spec                      | `<code>/CookedPC`    |
| `MOVIES_ID`      | spec                      | `<code>/Movies`      |
| `TFC_ID`         | spec `low`                | `{gamePath}`         |
| `UPKEXPLORER_ID` | spec                      | `{gamePath}`         |
| `BINARIES_ID`    | spec, plus explicit at 40 | `Binaries/Win<BITS>` |

**Installers:** `TFC` 25 → `UPKEXPLORER` 27 → `TFCMOD` 29 → `ROOT` 31 → `COOKEDSUB` 33 → `MOVIES` 35
→ `BINARIES` 37 → fallback 49.

**DLC folders:** `DLCSUB_FOLDERS` lists the game's DLC folder names and `DLCSUB_PATH` (default
`<code>/DLC`) is the folder, relative to the game root, that holds them. DLC folders sit at a
different depth in almost every UE2-3 game, so set `DLCSUB_PATH` per game. `installRoot` sends an
archive that starts at one of those folder names to `DLCSUB_PATH/<folder>` on `ROOT_ID`.

**`.upk` install folder picker (`upkFolderPicker`):** many `.upk` mods ship loose package files with
no folder, and nothing in the archive says whether they belong in the main `CookedPC` folder or in a
DLC folder. With the toggle on, `installCookedSub` asks the user:

- Only when the archive has no `COOKEDSUB_FOLDERS` match and holds a file whose extension is in
  `UPKPICKER_EXTS` (default `['.upk']`). Other `COOKEDSUB_EXTS` entries keep the normal route.
  Archives with a root or root-sub folder never reach this installer at all.
- "Main" installs exactly as with the toggle off, on `COOKEDSUB_ID`. A DLC choice installs to
  `DLCSUB_PATH/<choice>` on `ROOT_ID`, because that destination is outside `CookedPC`.
- If the same package file name appears in more than one folder of the archive, a second dialog asks
  which variant to install; the folders of the other variants are left out.
- Cancel in either dialog throws a user-cancel `VortexError`, which aborts the install quietly.
- Vortex passes `unattended === true` for collection and dependency installs. The picker then asks
  nothing and uses Main with the first variant, the same result as the toggle being off.
- With `DLCSUB_FOLDERS` empty the folder question is skipped; the variant question still applies.

The installer needs `context.api` and the `unattended` and `archivePath` install arguments, so it is
registered through a closure in `applyGame` rather than by bare function reference. `archivePath` is
matched against the download list to put a link to the mod's Nexus page in the dialog.

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
