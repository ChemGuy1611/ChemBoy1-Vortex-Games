# template-snowdropengine

Ubisoft Snowdrop (The Division, Avatar: Frontiers of Pandora). The smallest template at ~670 lines.
Snowdrop ModLoader is a `version.dll` proxy dropped in the game root; mods are data-folder
replacements.

---

**Constants:** `DATA_FILE` (the game's data folder name), `DATASUB_FOLDERS`
`['baked', 'graph objects', 'game system data']`, `MODLOADER_FILE` `version.dll`, `CONFIG_PATH`
`Documents/My Games/<config folder>`, `CONFIG_FILES` `['graphic settings.cfg']`, `CONFIG_EXTS`
`['.cfg']`. `UPLAYAPP_ID` and `STEAMAPP_ID` only.

| Mod type | Target |
| --- | --- |
| `CONFIG_ID` | absolute `Documents/My Games/<config folder>` |
| `DATA_ID` | `{gamePath}` |
| `DATASUB_ID` | `{gamePath}/<DATA_FILE>` |
| `MODLOADER_ID` | `{gamePath}` |

**Installers:** `MODLOADER` 25 → `DATA` 27 → `DATASUB` 29 → `CONFIG` 31 → fallback 49.

**Discovery:** Ubisoft Connect registry then `GameStoreHelper`. Snowdrop ModLoader downloads from
Nexus. No `deployNotify` — the loader is live as soon as it is deployed, with no external tool step.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../WINAPI_BINDINGS.md` (the Ubisoft Connect registry probe).
`../REQUIRES_LAUNCHER.md` (the Ubisoft Connect hand-off).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
