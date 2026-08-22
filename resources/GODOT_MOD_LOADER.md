# Godot Mod Loader

`https://github.com/GodotModding/godot-mod-loader` — "GML", a generalised mod loader for
GDScript-based Godot games. It is not a game-specific loader: the same addon is dropped into any
Godot game, and mods are distributed as ZIPs that the loader mounts at runtime. That generality is
what makes it worth documenting once here rather than per game.

Two things about GML shape every Vortex extension built on it, and both are easy to get wrong:

- **Its release stream carries two incompatible product lines under one tag sequence** — Godot 3 and
  Godot 4 — with completely different asset naming.
- **Its two mod folders live in different filesystems.** `mods/` is on disk next to the executable;
  `mods-unpacked/` is `res://`, which in an exported game means *inside the game's `.pck`*. Only one
  of the two is a place a mod manager can deploy to.

---

## Release Surface

GML publishes both engine lines from a single repository, newest-first in one `/releases` stream:

| Engine | Branch | Newest release | Asset name |
| --- | --- | --- | --- |
| Godot 4 (4.1–4.3) | `4.x-dev` | `v7.0.1` (2025-06-11) | `ModLoader-Self-Setup_7.0.1-WIN.zip` |
| Godot 3 (3.5+) | `3.x-dev` | `v6.3.0` (2025-01-27) | `godot-mod-loader_v6.3.0_self-setup.zip` |

Three consequences for any downloader that resolves GML from the GitHub API:

- **The two asset naming schemes differ in more than the version position.** The Godot 3 asset
  carries a **leading `v` on the version** (`godot-mod-loader_v6.3.0_self-setup.zip`); the Godot 4
  asset does not (`ModLoader-Self-Setup_7.0.1-WIN.zip`). A pattern written from the Godot 4 form and
  adapted by hand will silently fail to match the Godot 3 asset. Anchor the Godot 3 pattern as
  `^godot-mod-loader_v?(\d+\.\d+\.\d+)_self-setup` so both spellings survive a future rename.
- **`/releases/latest` is the Godot 4 release**, because 7.0.1 is newer than 6.3.0 in one shared
  sequence. A Godot 3 game cannot use the "latest stable" endpoint at all — the newest release
  simply has no asset its pattern can match. Reach `v6.3.0` by tag (a version pin) or by scanning
  the full `/releases` array instead.
- Releases before `v6.3.0` are not usable as a fallback. `v6.2.0` ships `ModLoderCompiled.zip`
  (a third naming scheme, and the typo is upstream's); `v6.0.0`–`v6.1.0` ship **no assets at all**,
  source only. There is no older self-setup build to fall back to.

Godot 3 support is effectively frozen — `v6.3.0` is the terminal release of that line, so pinning a
Godot 3 game to it costs nothing.

## What the Self-Setup Archive Contains

Both archives unpack to a single `addons/` root and nothing else — no `override.cfg`, no `mods`
folder, no wrapper directory. They are copied verbatim into the game's install folder:

```text
<game>/
  addons/
    JSON_Schema_Validator/
    mod_loader/
      mod_loader.gd            <- the autoload
      mod_loader_store.gd      <- the autoload that must load first
      mod_loader_setup.gd      <- the --script entry point
      setup/                   <- setup-only helpers + class cache
      api/  internal/  resources/  options/
      vendor/                  <- the bundled patching tool (see below)
```

The bulk of the download is one bundled binary:

| Release line | Bundled tool | Size | Purpose |
| --- | --- | --- | --- |
| Godot 4 (7.0.1) | `addons/mod_loader/vendor/GDRE/gdre_tools.exe` (+ `.pck`) | ~67 MB | patches `project.binary` into the game's pack |
| Godot 3 (6.3.0) | `addons/mod_loader/vendor/godotpcktool/godotpcktool.exe` | ~1.6 MB | same, older tool |

That is why the Godot 4 archive is ~24 MB compressed against ~660 KB for Godot 3. The tool is
**Windows-only**: `get_gdre_path()` returns the executable path on Windows and an empty string
everywhere else, which makes the injection path unavailable on Linux and macOS.

## Installing: the Two Setup Methods

The user adds one launch argument, `--script addons/mod_loader/mod_loader_setup.gd`, and runs the
game once. `mod_loader_setup.gd` then inserts `ModLoaderStore` and `ModLoader` at the top of the
autoload list and persists that change one of two ways.

### Binary injection (default)

`handle_injection()` writes a patched `project.binary` and a merged global class cache into the
game's own pack using the bundled tool, then performs a **rename dance on the game's own files**:

```text
game.pck        -> game-vanilla.pck      (original preserved)
game-modded.pck -> game.pck              (patched file takes the original name)
```

If the pack is embedded in the executable, the same rename applies to `game.exe` /
`game-vanilla.exe` / `game-modded.exe` instead. Temporary files under
`addons/mod_loader/setup/temp/` are created and removed as part of the run.

Practical consequences: the game's shipped `.pck` (or `.exe`) is no longer the file the store
installed, so **Steam / Epic file validation will revert it** and the setup has to run again. The
`-vanilla` file left behind is also not something a mod manager put there, so it survives a purge.
The advantage is that ModLoader ends up genuinely first in the autoload chain, which is what script
extensions of other autoloads need.

### `override.cfg` (the portable alternative)

Passing `--setup-create-override-cfg` alongside the `--script` argument selects
`handle_override_cfg()` instead. It writes project settings to `override.cfg` next to the
executable — Godot's own built-in settings-override mechanism — and copies the project data
directory out to a public `godot/` folder in the game directory
(`use_hidden_project_data_directory = false`).

Nothing about the game's pack is touched, which makes this the safe option under a mod manager and
the **only** option on Linux and macOS. The cost is that ModLoader is no longer guaranteed to be the
first autoload, so mods extending other autoloads may not work depending on the game.

Either way the first run ends with an `OS.alert()` and a restart — the settings only apply on the
next launch. Once setup has run, the `--script` argument is harmless to leave in place: the setup
script detects that the autoloads are already in position and hands straight off to the main scene
(and sets the window title to `<name> (Modded)`, which is the user-visible success signal).

## Command Line Arguments

Read by `mod_loader_setup.gd` and `_ModLoaderCLI`. All accept `--arg=value`, `--arg="value"`, or
`--arg value` form:

| Argument | Effect |
| --- | --- |
| `--script addons/mod_loader/mod_loader_setup.gd` | runs the setup; the one argument a user must add |
| `--setup-create-override-cfg` | use `override.cfg` instead of pack injection |
| `--only-setup` | `quit(0)` when setup finishes instead of alerting and restarting |
| `--exe-name=<name>` | override the assumed executable base name |
| `--pck-name=<name>` | override the assumed pack base name (defaults to the exe's base name) |

`--only-setup` is the useful one for a mod manager: it turns first-run setup into a headless,
non-interactive step that can be registered as its own tool instead of ambushing the user with an
alert dialog on their first launch.

`--exe-name` / `--pck-name` matter whenever the pack is not named after the executable, which
happens with launcher-wrapped and Xbox builds. Without them the setup looks for `<exe>.pck`, fails
to find it, concludes the pack is embedded, and tries to patch the executable instead.

## Where Mods Actually Load From

This is the section that decides whether a Vortex extension works at all. GML has three mod sources,
and they do not live in the same place:

| Source | Path resolved by GML | Real location in an exported game | Deployable by a mod manager |
| --- | --- | --- | --- |
| Packed mods | `get_local_folder_dir("mods")` → `OS.get_executable_path().get_base_dir()` + `/mods` | `<game>/mods/*.zip` on disk | **Yes** |
| Unpacked mods | `ModLoaderStore.UNPACKED_DIR` = `"res://mods-unpacked/"` | inside the game's `.pck` | **No** |
| Steam Workshop | Steam's workshop content directory | Steam library | No (Steam owns it) |

The asymmetry is deliberate on GML's side and forced by Godot. In an exported project, loading a
resource pack calls
`DirAccess::make_default<DirAccessPack>(DirAccess::ACCESS_RESOURCES)` — the Godot source comments it
as *"if data.pck is found, all directory access will be from here"*. `FileAccess::open()` is not
swapped the same way: it tries the pack first and then falls back to the real filesystem. So for a
`res://` path in an exported game:

- **Reading a known file** falls through to disk next to the executable. This is exactly why a loose
  `addons/mod_loader/*.gd` can be loaded at all.
- **Listing a directory** only ever sees pack contents.

GML enumerates unpacked mods with `get_dir_paths_in_dir()`, which is a directory listing — so a
`mods-unpacked/` folder created next to the executable is **invisible to stock GML**, no matter what
is in it. `load_from_unpacked` (default `true`) and the `res://mods-unpacked` documentation refer to
mods a developer baked into the pack at export time, plus the editor case, where
`get_game_install_dir()` short-circuits to `res://` under `OS.has_feature("editor")`.

**For a mod manager targeting stock GML, `<game>/mods/*.zip` is the only valid destination.** A game
exported with no pack at all is the one edge case where `res://` is the executable directory and
unpacked mods work loose — rare enough not to design around.

Game-specific forks routinely change this. See "Forked Loaders" below.

## Mod Package Structure

A distributed GML mod is a ZIP whose **internal layout mirrors the development tree**, not the
game folder:

```text
Author-ModName-1.2.3.zip
├── .godot/imported/          <- Godot 4 (".import/" on Godot 3)
└── mods-unpacked/
    └── Author-ModName/
        ├── mod_main.gd       <- required
        ├── manifest.json     <- required
        └── ...
```

The mod ID is `Namespace-ModName` (Thunderstore-compatible), used for the folder name, the ZIP
name, and the loader's internal registry. `.godot/imported/` must contain the mod's own imported
assets and must not contain vanilla ones.

Because that structure is what GML mounts, **a packed mod must be deployed as the ZIP, unmodified**.
Extracting it and copying the contents into the game folder does not produce anything GML can load.

`manifest.json` requires seven root keys — `name`, `namespace`, `version_number`, `website_url`,
`description`, `dependencies`, `extra` — plus three under `extra.godot`: `authors`,
`compatible_mod_loader_version`, `compatible_game_version`. A mod missing any of them is rejected at
load with a validation error.

## Options That Affect Packaging

`ModLoaderOptionsProfile` (`addons/mod_loader/resources/options_profile.gd`) is a game-developer
surface, not a user one, but four options change where mods are read from and are worth knowing when
diagnosing "my mods do not load":

| Option | Default | Effect |
| --- | --- | --- |
| `enable_mods` | `true` | master switch; `false` disables all mod loading |
| `load_from_local` | `true` | read `<game>/mods/*.zip` |
| `load_from_unpacked` | `true` | read `res://mods-unpacked` (see above for why that is not the game folder) |
| `load_from_steam_workshop` | `false` | read Steam Workshop content instead of `mods/` |
| `override_path_to_mods` | `""` | replaces the `mods` folder path entirely |

Also useful: `disabled_mods` (mod IDs skipped at load) and `locked_mods` (mod IDs the user cannot
toggle in a profile). A game shipping a non-empty `override_path_to_mods` moves the deployment
target somewhere a generic extension will not find.

## Files GML Creates in the Game Folder

None of these come from a mod archive, so a mod manager neither deploys nor purges them. They do
show up as unmanaged files in the game directory:

| Path | Created by | Notes |
| --- | --- | --- |
| `override.cfg` | `--setup-create-override-cfg` | project settings override |
| `godot/` | `--setup-create-override-cfg` | public copy of the project data dir |
| `<game>-vanilla.pck` / `-vanilla.exe` | injection setup | the original, renamed aside |
| `mod-hooks.zip` | GML 7 at runtime | generated hook pack; a new one triggers a restart prompt |
| `addons/mod_loader/setup/temp/` | injection setup | created and removed within the run |

`user://mod_configs` (`%APPDATA%\Godot\app_userdata\<game>\mod_configs` on Windows) holds per-mod
config JSON. GML 7 renames the pre-7.0 `user://configs` directory on first run.

The Godot user-data root is platform-specific: `%APPDATA%\Godot\app_userdata\<game>` on Windows,
`~/.local/share/godot/app_userdata/<game>` on Linux, and
`~/Library/Application Support/Godot/app_userdata/<game>` on macOS.

## Notes for a Vortex Extension

- **Deploy packed mods, not extracted ones.** For stock GML the mod type target is `{gamePath}/mods`
  and the staged file is the mod's ZIP. Extracting into `mods-unpacked` produces a folder GML never
  lists.
- **Deploy the loader to `{gamePath}`.** The self-setup archive's `addons/` root is already correct
  relative to the game folder, so a copy-everything installer works — but filter the archive first
  (see the next point).
- **Check what the archive actually contains before copying it wholesale.** Loader archives are
  built by their authors and are not always clean; a stray build or tooling directory copied into
  the game folder costs thousands of deployed files for no benefit.
- **`--setup-create-override-cfg` is the safer default under a mod manager.** Injection rewrites the
  game's own pack, which store validation reverts and which leaves a `-vanilla` file behind.
- **Prefer `--only-setup` for a dedicated setup tool** so the user is not handed an `OS.alert()` and
  a forced restart the first time they launch through the manager.
- **Launch arguments do not survive a store hand-off.** Launching through Steam or Epic drops extra
  arguments, so a game whose loader needs `--script ...` needs either a direct-executable tool set
  as the primary starter or the argument entered in the store's own launch options.
- **Version-resolve by asset pattern, and pin Godot 3.** The shared release stream means "latest"
  is always the Godot 4 line.

## Forked Loaders

Several Godot games ship a game-specific loader instead of stock GML. They borrow GML's vocabulary —
`mods/`, `mods-unpacked/`, `manifest.json`, `mod_main.gd`, `Namespace-ModName` — while changing the
parts that matter for deployment, so the naming is not a safe guide to behavior.

The pattern to check for in any fork is which base directory it resolves its mod folders against.
A fork built on `OS.get_executable_path().get_base_dir()` can load unpacked mod folders from the
game directory, which stock GML cannot; a fork that kept `res://` cannot. Forks also add their own
content directories with their own layout rules — a maps or levels folder alongside `mods/`, for
instance — which a generic GML-shaped installer will not recognise.

---

## See also

`templates/TEMPLATE_GODOT.md` (the Vortex template built on this loader — its toggles, mod types,
and installer ladder).
`TEMPLATES_OVERVIEW.md` (template selection and the shared extension anatomy).
`DOWNLOADER.md` (the GitHub requirements module that resolves the loader release — the
`fileArchivePattern`, `pinVersion`, and `resolveVersion` fields referenced above).
`ARCHIVE_HANDLER.md` (keeping a mod in its archive and the `util.SevenZip` repack path).
`INSTALLER_SYSTEM.md` (`registerInstaller` test/install contracts behind the mod-type routing).
`REGISTER_GAME.md` (the `spec` / `applyGame()` contract, including `parameters` and `modPath`).
`REQUIRES_LAUNCHER.md` (the store hand-off that drops custom launch arguments).
`RUN_EXECUTABLE.md` (`api.runExecutable`, for registering a setup tool with its own arguments).
`VORTEX_DEPLOYMENT.md` and `NTFS_LINKS.md` (what deploying the loader into the game folder does on
disk, and why a self-modifying setup and hardlinks interact badly).
`MODWORKSHOP_API.md` (where some Godot game loaders are hosted instead of GitHub).
`GITHUB_API.md` (what `/releases/latest` actually selects, and why a repo shipping two product
lines from one release stream needs a tag lookup instead).
