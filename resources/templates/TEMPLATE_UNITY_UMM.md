# template-unity-umm

Unity with Unity Mod Manager. The defining feature is what this template does *not* do: it never
fetches UMM itself. `applyGame` calls `context.requireExtension('modtype-umm')`, and `main`'s
`context.once()` registers the game with the UMM helper extension:

---

```js
context.api.ext.ummAddGame({
  gameId: GAME_ID,
  autoDownloadUMM: true,
});
```

The helper extension owns downloading, installing, and patching UMM into the game. This template
only handles the mods.

**Constants:** `GAME_STRING` (drives both `<GAME_STRING>.exe` and `<GAME_STRING>_Data`),
`UNITY_BUILD` (`'mono'` / `'il2cpp'`), `UNITY_ARCH`, `UMM_FOLDER` `UnityModManagerInstaller`,
`UMM_INST_EXEC` `UnityModManager.exe`, `UMM_MARKER` (the file whose presence means UMM is installed),
`PLUGIN_FOLDER` `Plugins` with `PLUGIN_EXTS` `['.dll']`, `ASSETS_EXTS`
`['.assets', '.resource', '.ress']`, `VERSION_FILE` `Version.info`, and `DEV_REGSTRING` /
`GAME_REGSTRING` for the LocalLow config path.

| Mod type | Priority | Target |
| --- | --- | --- |
| `ROOT_ID` | spec | `{gamePath}` |
| `ASSEMBLY_ID` | 60 | `<data>/Managed` (mono) or `.` (IL2CPP) |
| `ASSETS_ID` | 62 | `<data>` |

The assembly and assets types are registered explicitly rather than through `spec.modTypes` because
`DATA_FOLDER` can differ per store build and their paths are recomputed at runtime.

**Installers:** `ROOT` 8 → `ASSEMBLY` 25 → `ASSETS` 27 → fallback 49. `ROOT` sits below the normal
25–49 band so it is tested ahead of the UMM helper extension's own installers.

Extra toolbar action: Open Data Folder. No `deployNotify` — UMM applies mods at game launch.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../VORTEX_EXTENSION_LOADING.md` (`requireExtension` and the `api.ext` hand-off).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
