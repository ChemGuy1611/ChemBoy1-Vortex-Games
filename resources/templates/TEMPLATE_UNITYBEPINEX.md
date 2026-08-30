# template-unitybepinex

Unity with BepInEx, in either the mono (`5.4.23.x`) or IL2CPP (`6.0.0` bleeding-edge) line. Like
`unity-umm`, the loader itself is delegated — `context.requireExtension('modtype-bepinex')` plus an
`api.ext.bepinexAddGame(...)` registration — but here the registration has three distinct branches
chosen by toggle:

---

1. **Custom Nexus pack** — when `BEPINEX_PAGE_ID` is set and `allowBepinexNexus` is on, a
   `customPackDownloader` points at that Nexus page and file ID.
2. **GitHub mono release** — `forceGithubDownload: true` with `bepinexVersion` and `unityBuild`
   passed through.
3. **IL2CPP bleeding edge** — a `customPackDownloader` calling `downloadBepinexBleedingEdge`, which
   fetches the CI build from `builds.bepinex.dev`.

`allowBepinexNexus` defaults to `false` in the template pending fixes to that path.

**Version constants.** `BEPINEX_VERSION` is `'5.4.23.5'` or `'6.0.0'`; when it is `6.0.0` the
template rewrites it in place to `6.0.0-be.<BEP_BE_VER>+<BEP_BE_COMMIT>` so the version string
matches what the bleeding-edge artifact actually reports.

**Build-dependent paths.** `ASSEMBLY_PATH` is `<data>/Managed` with `ASSEMBLY_FILES`
`['Assembly-CSharp.dll', 'Assembly-CSharp-firstpass.dll']` on mono, and `.` with
`['GameAssembly.dll']` on IL2CPP. `setGameVersion` recomputes both when an alternate store build with
a different `_Data` folder is detected.

**ConfigurationManager is the extension's own dependency**, not the helper extension's. It is a
`downloader.js` requirement (`BEPCFGMAN_REQUIREMENTS`) matched against
`BepInEx.ConfigurationManager_<variant>_v<version>` on GitHub, where the variant is `BepInEx5` for
mono and `IL2CPP` otherwise. The variant test uses `BEPINEX_BUILD.includes('mono')` rather than an
equality check, because this family uses two vocabularies interchangeably: `mono`/`il2cpp` and
`unitymono`/`unityil2cpp`. `autoInstall` is deliberately omitted so it installs unattended, gated by
`downloadCfgMan`; when that toggle is off, `getRequirements()` returns an empty array so the update
check cannot back-door install it.

| Mod type | Priority | Target |
| --- | --- | --- |
| `ROOT_ID` | spec | `{gamePath}` |
| `BEPCFGMAN_ID` | spec | `Bepinex` |
| `BEPMOD_ID` | spec | `BepinEx/plugins` |
| `ASSEMBLY_ID` | 60 | `<data>/Managed` or `.` |
| `ASSETS_ID` | 62 | `<data>` |

**Installers:** `ROOT` 8 → `BEPCFGMAN` 9 → `ASSEMBLY` 25 → `ASSETS` 27 → fallback 49.
ConfigurationManager **must** stay at 9: the BepInEx helper extension's own mod types start at 10 and
would otherwise hijack the archive.

An `onCheckModVersion` handler is wired to `check-mods-version` in `context.once()`. Extra toolbar
actions: Download BepInExConfigManager, Open BepInEx.cfg, Open Data Folder. Config resolves to
`LocalLow/<dev>/<game>[/<userId>]/<config folder>`.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../DOWNLOADER.md` (the ConfigurationManager requirement object).
`../BEPINEX.md` (the loader itself: the three runtimes, Doorstop, plugin and patcher formats, and
the folders this template routes mods into).
`../BEPINEX_BE_BUILDS.md` (the IL2CPP bleeding-edge builds).
`../VORTEX_EXTENSION_LOADING.md` (`requireExtension` and `api.ext.bepinexAddGame`).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
