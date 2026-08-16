# template-frostbite

EA Frostbite with Frosty Mod Manager. Frosty owns the actual patching: it reads `.fbmod` files from
its own `Mods/<game>` folder and builds a patched `ModData` tree the game then loads. Vortex never
touches game data directly, which is why `allowSymlinks` defaults to `false` and everything is
staged into Frosty's folders.

---

**Toggles:** `hasArchives` (`.archive` file support alongside `.fbmod`), `needsKey` (the game needs
an encryption key file placed next to Frosty), `hasUserIdFolder`, and `setupNotification`, which
defaults to `true` because of the DatapathFix warning below.

**Constants:** `EAAPP_ID` (with `GOGAPP_ID` `null`), `FROSTY_FOLDER` `FrostyModManager`,
`FROSTYMOD_PATH` `FrostyModManager/Mods/<game>`, `FROSTYMOD_EXTS` `['.fbmod', '.archive']`,
`MODDATA_FOLDER` `ModData`, `FROSTY_EXEC` `frostymodmanager.exe`, `FROSTY_URL` pinned to the
FrostyToolsuite `v1.0.6.3` release zip, `FROSTY_CONFIG_PATH`
`%LOCALAPPDATA%\Frosty\manager_config.json`, `PATCH_FILE` `DatapathFixPlugin.dll` from the
`DatapathFixPlugin` `v1.7.1` release, `PLUGIN_PATH` and `PATCH_PATH` both `FrostyModManager/Plugins`,
`KEY_PATH` `FrostyModManager`.

| Mod type | Gate | Target |
| --- | --- | --- |
| `ROOT_ID` | always | `{gamePath}` |
| `FROSTYMOD_ID` | always | `FrostyModManager/Mods/<game>` |
| `PLUGIN_ID` | always | `FrostyModManager/Plugins` |
| `FROSTY_ID` | always, spec `low` | `{gamePath}` |
| `KEY_ID` | `needsKey` | `FrostyModManager` |

`PATCH_ID` is deliberately **not** a mod type. The DatapathFix plugin is published as a naked `.dll`
rather than an archive, so it cannot be staged as a mod — `downloadPatch` downloads it, then finds
it in the download folder and copies it straight into `FrostyModManager/Plugins`.

**Installers:** `FROSTY` 25 → `FROSTYMOD` 30 → `PLUGIN` 35 → `KEY` 40 (behind `needsKey`) → fallback
49. This template steps by 5 rather than 2.

**Multi-mod archives.** `chooseFilesToInstall` prompts when an archive contains several `.fbmod`
files, and `packInstructionsNotify` explains the choice.

**Frosty housekeeping actions.** Three maintenance operations are exposed that no other template
has:

- `deleteModData(api)` — confirmation dialog, then `fsPromises.rm(ModData, { recursive: true })`.
  Frosty rebuilds the folder on its next launch, which is the standard fix for a corrupted merge.
- `togglePatch(api, toggle)` — reads Frosty's `manager_config.json`, flips
  `GlobalOptions.DatapathFixEnabled`, and writes the JSON back.
- `removePatch(api)` — confirmation dialog, then unlinks the plugin dll.

`downloadPatch` refuses outright when the detected version is Steam: DatapathFix is only needed on
the EA App and Epic builds.

**Tools:** `FrostyModManagerLaunch` — "Launch Modded Game", `parameters: ['-launch Default']`, marked
`defaultPrimary` — and a second entry that opens the Frosty UI. Asset `frosty.png`. `deployNotify`
offers a "Run Frosty" button. Extra toolbar actions: Delete ModData Folder, Open Frosty Mods Folder.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../WINAPI_BINDINGS.md` (registry discovery for the EA App build).
`../REQUIRES_LAUNCHER.md` (the EA App hand-off).
`../RUN_EXECUTABLE.md` (`runFrosty`).
`../NOTIFICATIONS_DIALOGS.md` (the ModData and DatapathFix confirmation dialogs).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
