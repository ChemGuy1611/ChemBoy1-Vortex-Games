# template-godot

Godot 3 and 4 with GodotModLoader. Two toggles do most of the work here, and both change file
layout rather than just enabling a feature.

---

**`keepZips`** decides where mods go and whether they stay compressed. `false` (default) sets
`MOD_FOLDER` to `mods-unpacked` and registers `installMod`, which extracts. `true` sets it to `mods`
and registers `installModZip`, which keeps the archive: if the download already contained a nested
`.zip`/`.7z`/`.rar` it is copied through as-is, otherwise the whole staging folder is repacked with
`util.SevenZip` into `<modname>.zip`, with the name truncated to 25 characters.

**`customLoader`** switches the loader payload. `true` (default) expects `mod_loader.gd`; `false`
expects the self-setup build's `mod_loader_setup.gd` and flips `defaultPrimary` onto the Console
Launch tool. `ENGINE_VERSION` (`'3'` or `'4'`) picks the loader release line: `7.0.1` with archive
`ModLoader-Self-Setup_<ver>-WIN.zip` for Godot 4, `6.3.0` with
`godot-mod-loader_<ver>_self-setup.zip` for Godot 3.

**Constants:** `MOD_EXTS` `['.gd']`, `OVERRIDE_FILE` `override.cfg`, `DATA_FOLDER`
`Godot/app_userdata/<game>` (the Godot user-data root that config and saves hang off).

| Mod type | Priority | Target |
| --- | --- | --- |
| `MOD_ID` | spec `high` | `mods-unpacked` or `mods` |
| `LOADER_ID` | spec `low` | `{gamePath}` |
| `CONFIG_ID` | 60 | absolute `CONFIG_PATH` |
| `SAVE_ID` | 60 | absolute `SAVE_PATH` |

**Installers:** `LOADER` 25 → `MOD` 27 (zip or unpack variant) → fallback 49.

**Mod folder naming.** `installMod` derives the destination folder from the archive's root
directory; when the archive has no root folder it falls back to the mod name with the archive
extension stripped, truncated to 29 characters, or to the `.gd` file's own base name.

**Auto-download:** GodotModLoader is a `downloader.js` requirement resolved from GitHub releases,
with an update check wired to `check-mods-version`. Extra toolbar action: Open override.cfg. Tools:
Custom Launch and Console Launch.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../DOWNLOADER.md` (the requirement object and version-resolve strategy for the loader).
`../ARCHIVE_HANDLER.md` (the repack path behind `keepZips`).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
