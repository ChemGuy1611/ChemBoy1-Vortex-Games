# template-cobraengineACSE

Frontier's Cobra Engine (Planet Zoo, Planet Coaster, Jurassic World Evolution). Content ships as
`.ovl` overlay files under `Win64/ovldata`, and ACSE is the Lua script extender that most mods
depend on.

---

**Constants:** `DEV_FOLDER` `Frontier Developments`, `ROOT_FOLDERS`
`['Win64', 'Blueprints', 'TerrainSkirts', 'ProvidedCustomTextures', 'Parks', 'Movies']`, `ACSE_PATH`
`Win64/ovldata`, `ACSE_FILE` `ACSE`, `ACSE_MOD_FILE` `Main.ovl`, `MOVIES_EXTS` `['.webm']`,
`SAVE_EXTS` `['.blpr2', '.prk2']`.

| Mod type | Target |
| --- | --- |
| `ACSE_ID` | `Win64/ovldata` |
| `ROOT_ID` | `{gamePath}` |
| `ACSE_MOD_ID` | `Win64/ovldata` |
| `OVLDATA_ID` | `Win64` |
| `LOCALISED_ID` | `Win64/ovldata/ACSE` |
| `MOVIES_ID` | `Movies` |
| `SAVE_ID` | absolute `SAVE_PATH` (outside the game folder) |

**Installers:** `ACSE` 25 → `ROOT` 27 → `ACSE_MOD` 28 → `LOCALISED` 29 → `MOVIES` 31 → `OVLDATA` 33
→ `SAVE` 49 → fallback 49. Two departures from the usual pattern: `ACSE_MOD` sits at 28 rather than
on the odd-number step, and `SAVE` shares priority 49 with the fallback — it is registered first, so
it is tested first.

**Save and config.** `%USERPROFILE%\Saved Games\Frontier Developments\<game>\<userId>\Saves` and
`…\Config`. The user-ID subfolder is scanned for unconditionally at module load — there is no
`hasUserIdFolder` toggle here, because Frontier titles always have one.

**Auto-download:** ACSE from Nexus. Stores: Steam, Epic, Xbox.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../NOTIFICATIONS_DIALOGS.md` (the setup notification pattern).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
