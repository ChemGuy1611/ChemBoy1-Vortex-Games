# template-godot

Godot 3 and 4 with GodotModLoader. Two toggles do most of the work here, and both change file
layout rather than just enabling a feature.

---

**`keepZips`** decides where mods go and whether they stay compressed. `false` (default) sets
`MOD_FOLDER` to `mods-unpacked` and registers `installMod`, which extracts. `true` sets it to `mods`
and registers `installModZip`, which keeps the archive: if the download already contained a nested
`.zip`/`.7z`/`.rar` it is copied through as-is, otherwise the whole staging folder is repacked with
`util.SevenZip` into `<modname>.zip`, with the name truncated to 25 characters.

> **The two toggles are not independent.** Stock Godot Mod Loader resolves `mods-unpacked` against
> `res://`, which in an exported game is the inside of the `.pck` — a `mods-unpacked` folder in the
> game directory is invisible to it, because GML enumerates that folder with a directory listing and
> Godot serves `res://` listings from the pack only. Stock GML therefore needs `keepZips` **`true`**
> (`mods/*.zip`). The `false` default only works against a forked loader that resolves its folders
> against the executable directory instead. `GODOT_MOD_LOADER.md` has the mechanism and the check to
> run against a given fork.

**`customLoader`** switches the loader payload. `true` (default) expects `mod_loader.gd`; `false`
expects the self-setup build's `mod_loader_setup.gd`, sets `PARAMETERS_STRING` to
`--script addons/mod_loader/mod_loader_setup.gd`, and puts `defaultPrimary` on the **Custom Launch**
tool so the argument survives (a store hand-off would drop it). `ENGINE_VERSION` (`'3'` or `'4'`)
picks the loader release line: `7.0.1` with archive `ModLoader-Self-Setup_<ver>-WIN.zip` for Godot 4,
`6.3.0` with `godot-mod-loader_v<ver>_self-setup.zip` for Godot 3 — note the **leading `v` on the
Godot 3 version**, which the shipped `LOADER_ARC_NAME` and `ARCHIVE_PATTERN` currently omit.

**Constants:** `MOD_EXTS` `['.gd']`, `OVERRIDE_FILE` `override.cfg`, `DATA_FOLDER`
`Godot/app_userdata/<game>` (the Godot user-data root that config and saves hang off).

| Mod type | Priority | Target |
| --- | --- | --- |
| `MOD_ID` | spec `high` | `mods-unpacked` or `mods` |
| `LOADER_ID` | spec `low` | `{gamePath}` |
| `CONFIG_ID` | 60 | absolute `CONFIG_PATH` — scaffolded commented out |
| `SAVE_ID` | 60 | absolute `SAVE_PATH` — scaffolded commented out |

**Installers:** `LOADER` 25 → `MOD` 27 (zip or unpack variant) → fallback 49.

**Mod folder naming.** `installMod` derives the destination folder from the archive's root
directory; when the archive has no root folder it falls back to the mod name with the archive
extension stripped, truncated to 29 characters, or to the `.gd` file's own base name.

**Auto-download:** two mutually exclusive routes, picked by `customLoader`. `false` makes
GodotModLoader a `downloader.js` requirement resolved from GitHub releases, with an update check
wired to `check-mods-version`. `true` calls `downloadModLoader()` instead, which fetches
`LOADER_CUSTOM_URL` directly and registers **no update check at all** — a game on a custom loader
never sees a new loader version unless one is wired in. Because both GML engine lines share one
release stream, `/releases/latest` is always the Godot 4 release, so a Godot 3 game has to reach
`v6.3.0` by tag rather than by "latest".

**Constants defined but unused:** `PAR_STRING2` (`--setup-create-override-cfg`, the portable
alternative to pack injection), `LOADER3_DL_URL`, `LOADER4_DL_URL`.

Extra toolbar action: Open override.cfg. Tools: Custom Launch and Console Launch.

---

## See also

`../GODOT_MOD_LOADER.md` (the loader this template targets: its two release lines, the self-setup
methods, and why `mods/` and `mods-unpacked` are not both deployable — read alongside this).
`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../DOWNLOADER.md` (the requirement object and version-resolve strategy for the loader).
`../ARCHIVE_HANDLER.md` (the repack path behind `keepZips`).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
