# template-anvilengine

Ubisoft Anvil (Assassin's Creed, Ghost Recon). Game assets live inside packed `.forge` archives.
AnvilToolkit (ATK) unpacks, edits, and repacks them, so Vortex's job is to stage extracted content
where ATK expects it and then get out of the way — the mods are not live until the user runs ATK.

---

That repacking step is why **`allowSymlinks` defaults to `false` here**: ATK rewrites the files in
place, and a symlink would push the write back into the staging folder.

**Toggles:** `hasAtk` (default `true`) gates the ATK mod types, the ATK tool entry, the ATK download,
and five installers. `hasForger` (default `false`) adds Forger Patch Manager support (`.forger2`
patches) for the older AC titles.

**Constants:** `UPLAYAPP_ID`, `EXTRACTED_FOLDER` `Extracted`, `RENAME_FOLDER`
`RENAME_ME_TO_FORGE_NAME.forge`, `FORGER_FOLDER` `ForgerPatches`, `LOOSE_EXTS` `['.data']`,
`SETTINGS_FILE` (the game's INI), `ATK_FILE` `3699` on the Nexus `site` domain, `FORGER_FILE` `716`
on the `assassinscreedodyssey` domain. `GOGAPP_ID` is `null` — Ubisoft titles are not on GOG.

| Mod type | Gate | Target |
| --- | --- | --- |
| `EXTRACTED_ID`, `FORGEFOLDER_ID`, `DATAFOLDER_ID`, `LOOSE_ID`, `FORGE_ID` | `hasAtk` | `{gamePath}` |
| `ROOT_ID` | always | `{gamePath}` |
| `ATK_ID` | `hasAtk`, spec `low` | `{gamePath}` |
| `FORGER_ID` | `hasForger`, spec `low` | `{gamePath}` |
| `FORGERPATCH_ID` | `hasForger` | `{gamePath}/ForgerPatches` |

**Installers:** `ATK` 25 → `EXTRACTED` 27 → `FORGEFOLDER` 29 → `DATAFOLDER` 31 → `LOOSE` 33 (all
five behind `hasAtk`) → `FORGE` 35 → `ROOT` 37 → `FORGER` 41 → `FORGERPATCH` 43 (both behind
`hasForger`) → fallback 49.

**The `.forge` rename dialog.** A mod packaged as a loose `.data` folder does not say which `.forge`
archive it belongs in, so `installDataFolder` / `installLoose` stage it under the placeholder
`RENAME_ME_TO_FORGE_NAME.forge` and fire `renamingRequiredNotify`. `folderRenameDialog` takes a text
input, appends `.forge` if the user left it off, rejects the bare placeholder, then `rename()`
purges deployment, renames the folder inside staging with `fs.renameAsync`, and redeploys. Renaming
inside staging rather than the game folder is what makes the change survive the next deploy.

**Discovery:** Ubisoft Connect registry (`SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\<UPLAYAPP_ID>`)
first, `GameStoreHelper` second.

**Tools:** Custom Launch, plus ATK and Forger pushed onto the array when their toggles are on;
commented-out entries for Ubisoft Plus and Vulkan launches. Assets `anvil.png`, `forger.png`.
`deployNotify` reminds the user to run ATK, with `runDeployTool(api, toolId, toolName)` behind the
button. Extra toolbar action: Open Settings INI.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../WINAPI_BINDINGS.md` (the Ubisoft Connect registry probe).
`../REQUIRES_LAUNCHER.md` (the Ubisoft Connect hand-off).
`../RUN_EXECUTABLE.md` (`runDeployTool`, behind the run-ATK button).
`../NOTIFICATIONS_DIALOGS.md` (the rename input dialog and the deploy notification).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
