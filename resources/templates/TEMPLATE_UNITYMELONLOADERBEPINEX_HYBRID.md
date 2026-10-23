# template-unitymelonloaderbepinex-hybrid

Unity games where the community has settled on neither loader, so the user picks. BepInEx and
MelonLoader are mutually exclusive — installing both breaks the game — and essentially every unusual
mechanism in this template exists to enforce that.

---

It is the only template bundling two downloader modules: `downloader.js` and
`bepinexbe_downloader.js`. Mono-only extensions delete the `bepinexbe_downloader.js` copy, its
`require`, and the bleeding-edge requirement.

## Loader selection

`loaderChoice` (default `true`) enables the picker; `recommendedLoader` (`'bep'` / `'mel'`, default
`'mel'`) is shown as "(Recommended)" in it, or, when `loaderChoice` is off, simply decides which
loader gets installed.

- `chooseModLoader` presents the dialog and installs exactly one loader.
- `deconflictModLoaders`, with `removeBepinex` / `removeMelon` / `removeCustom` /
  `removeCustomFiles`, tears down whichever loader is being replaced.
- `loaderSwitchRestart` (default `false`) triggers `relaunchExt` after a switch, for games where
  the extension needs a clean reload.
- `preventPluginInstall` (default `true`) makes the plugin installer at priority 33 inspect the dll
  and refuse plugins built for the loader that is not installed; `unknownDllNotify` handles the case
  where it cannot tell. Turn it off for genuinely cross-compatible plugins.
- Module-level `bepinexInstalled` / `melonInstalled` / `customInstalled` flags track the current
  state, refreshed by `isBepinexInstalled` / `isMelonInstalled` / `isCustomInstalled`.

**`getRequirements(api)` returns only the installed loader's requirement set** — never both. The
bleeding-edge requirements are deliberately excluded from it and served by a separate
`getBepinexBeRequirements(api)`, because they come from a different module with a different shape.

## Requirement sets

| Set                          | Source                                          | Version strategy             | Note                                                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MELON_REQUIREMENTS`         | GitHub releases                                 | `resolveVersionByModVersion` | The tag carries the version, the asset name does not, so the pattern has no capture group; the regex is anchored so a future `MelonLoader.x64.CI.zip` cannot be selected                                                 |
| `MELON_NIGHTLY_REQUIREMENTS` | nightly.link CI artifact of `alpha-development` | `resolveVersionByNightlyRun` | Not a release, so identity comes from the newest successful workflow run, compared by run number. No `findDownloadId` — the artifact filename never changes, so a local copy is always stale. `pinVersion` has no effect |
| `BEPINEX_REQUIREMENTS`       | GitHub releases, mono only                      | pattern match                | Four-segment `5.4.23.5` defeats `semver.coerce`                                                                                                                                                                          |
| `BEPINEX_BE_REQUIREMENTS`    | `builds.bepinex.dev`, IL2CPP                    | build number                 | Owned by `bepinexbe_downloader.js`                                                                                                                                                                                       |
| `BEPCFGMAN_REQUIREMENTS`     | GitHub releases                                 | `resolveVersionByPattern`    | Variant `BepInEx5` vs `IL2CPP`                                                                                                                                                                                           |
| `MELONPREFMAN_REQUIREMENTS`  | GitHub releases                                 | direct copy                  | A naked `.dll`, not an archive                                                                                                                                                                                           |

All of them set `autoInstall: false`: the loader-choice dialog and the toolbar buttons own installs,
never the update check.

**`setup()` must reassign `MELONPREFMAN_REQUIREMENTS[0].directCopyPath`.** The array is built at
module load, when `GAME_PATH` is still an empty string, so the copy destination is only correct once
`setup()` has run.

**.NET dependency check.** MelonLoader on IL2CPP needs the .NET 6 desktop runtime. `checkDotNetMelon`
probes `HKLM\SOFTWARE\WOW6432Node\dotnet\Setup\InstalledVersions\x64\sharedfx\Microsoft.WindowsDesktop.App`
and `dotNetMelonNotify` links the download when it is missing.

## Mod types and installers

Eleven mod types come from `spec` — `BEPINEX_MOD` (`BepInEx`), `MELON_MOD` (`.`),
`BEPINEX_PLUGINS` / `BEPINEX_PATCHERS` / `BEPINEX_CONFIG` (`BepInEx/plugins|patchers|config`),
`MELON_MODS` / `MELON_PLUGINS` / `MELON_CONFIG` / `MELON_USERLIB` (`Mods`, `Plugins`, `UserData`,
`UserLibs`), `BEPCFGMAN`, `MELONPREFMAN`, plus `ROOT`, `BEPINEX`, and `MELON` at `{gamePath}`.
`TEXTURES` (`BepInEx/plugins/TextureReplacer`) is appended to `spec` behind `hasTextureReplacer`.
Registered explicitly on top: `CUSTOMLOADER_MOD` 25, `CUSTOMLOADER_PLUGIN` 27, `CUSTOM` 58,
`CUSTOMLOADER` 60, `ASSEMBLY` 60, `ASSETS` 62, and `SAVE` 64 (behind `enableSaveInstaller`). The
`SAVE` folder is `SAVE_PATH`, read when Vortex asks for it, so it switches to the Xbox save location
once the Xbox build is detected.

**Installers:** `CUSTOMLOADER` 25 (behind `hasCustomLoader`) → `BEPINEX` 26 → `MELON` 27 → `ROOT` 28 →
`BEPCFGMAN` 29 → `MELONPREFMAN` 30 → `ASSEMBLY` 31 → plugin 33 → `TEXTURES` 35 (behind
`hasTextureReplacer`) → `ASSETS` 37 → `CUSTOM` 39 (behind `hasCustomMods`) → `SAVE` 47 (behind
`enableSaveInstaller`) → fallback 49 (behind `fallbackInstaller`). The `SAVE` installer installs as
the `SAVE` mod type.

**Texture Replacer textures.** `hasTextureReplacer` is for games with a Texture Replacer BepInEx plugin
that loads every `.png` under `BepInEx/plugins/TextureReplacer`, subfolders included, and matches each
by file name to an in-game texture. The `TEXTURES` installer takes an archive with a `.png` whose name
starts with `TEXTURES_STRING` (placeholder `"XXX"` until set, compared lower-cased) and no `.dll` (a
plugin that ships textures stays with the plugin sorter). It anchors on the shallowest matching texture,
so subfolders the mod sorts its textures into are kept and outer wrapper folders are dropped. The
folder is in `MODTYPE_FOLDERS` when the toggle is on.

**Custom loader support.** `hasCustomLoader`, `customLoaderInstaller`, and `hasCustomMods` let a game
add a third, game-specific loader with its own mod types and folder layout; `getCustomFolder`
resolves paths that depend on which loader is currently active. `hasCustomLoader` registers the
`CUSTOMLOADER_MOD`, `CUSTOMLOADER_PLUGIN` and `CUSTOMLOADER` mod types and the loader installer, which
recognises the loader by `CUSTOMLOADER_FILE`. `customLoaderInstaller` swaps that installer for one that
recognises the loader's own installer by `CUSTOMLOADER_EXEC`, installs it below `CUSTOMLOADER_FOLDER`,
adds it as a tool, and makes the marker file `CUSTOMLOADER_MARKER_PATH` the proof that it has been run.

A custom loader counts as installed through `isCustomInstalled`: its mod in the profile, or for a
loader with an installer also the marker file. After a purge, installer files are only removed while
the marker file exists, and the "run the installer" reminder only shows after a deploy for a loader
that has an installer.

`ALT_VERSION` (default `"alt"`) is the label for a build with its own executable (Epic, GOG or demo);
the Xbox build sets `"xbox"` itself and is the only one whose version is read from
`appxmanifest.xml`. The root installer renames the default data folder for both. With
`preventPluginInstall` on, a refusal dialog cancels the install however it is closed.

`check-mods-version`, `did-deploy`, and `did-purge` handlers are all registered. Toolbar actions are
the widest of any template: Download Latest BepInEx BE (IL2CPP, not served from Nexus), Download
BepInExConfigManager (`allowBepCfgMan`), Download Latest MelonLoader (from the game's Nexus page when
`melonFromNexus` is on), Download
MelonPreferencesManager (`allowMelPrefMan`), Open Data Folder, Open BepInEx Config, Open BepInEx Log,
Open MelonLoader Config, Open MelonLoader Log, plus the universal set. Open Save Folder, Open
PCGamingWiki Page and Submit Bug Report only appear once `SAVE_FOLDERNAME`, `PCGAMINGWIKI_URL` and
`EXTENSION_URL` are filled in. With `isXna` the MelonLoader buttons, Open Data Folder and the assets
mod type and installer are dropped; the Bleeding Edge button stays, because an XNA game takes the
Bleeding Edge route.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../DOWNLOADER.md` (requirement objects and every version-resolve strategy used here).
`../BEPINEX.md` and `../MELONLOADER.md` (the two loaders themselves: their bootstraps, folder
layouts and mod formats, and why installing both at once breaks the game).
`../BEPINEX_BE_BUILDS.md` (the sibling module this template bundles).
`../WINAPI_BINDINGS.md` (the .NET 6 runtime registry probe).
`../NOTIFICATIONS_DIALOGS.md` (the loader-choice dialog).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
