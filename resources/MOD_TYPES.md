# Mod Types (`context.registerModType`)

How a mod type decides where a mod deploys, how Vortex assigns a type to a newly installed mod, and the mod types Vortex bundles that can appear in any game.

Source: `src/renderer/src/extensions/gamemode_management/util/modTypeExtensions.ts` (registry), `getGame.ts` (`modTypes` / `getModPaths` getters), `mod_management/InstallManager.ts` (`determineModType`), `mod_management/util/deploy.ts` (`genSubDirFunc`), `mod_management/util/allTypesSupported.ts`.

---

## Signature

```js
context.registerModType(
  id,           // string, never "" (the empty string is the game's default type)
  priority,     // number, lower = tested first during auto-detection
  isSupported,  // (gameId) => boolean
  getPath,      // (game: IGame) => string, absolute deploy target, or undefined
  test,         // (instructions: IInstruction[]) => Promise<boolean>
  options,      // IModTypeOptions, optional
);
```

The registry is one flat array shared by every game, kept in **registration order**. A game's types are whatever `isSupported(game.id)` returns true for, re-filtered on every read of `game.modTypes` / `game.getModPaths()`, so `isSupported` can depend on state (repo templates return true only once the game has a discovered path).

| Parameter     | Notes                                                                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Stored on the mod as `mod.type`. Also becomes a CSS class `mod-modtype-<id>` on the mod's table row.                                                                                                                        |
| `priority`    | Only used by auto-detection (below). Vortex's own comment asks for 100 when there is no reason to pick otherwise. Repo convention: `TEMPLATES_OVERVIEW.md` "Mod type priorities".                                          |
| `isSupported` | Called with a game id for every game, not just yours. Always check the id.                                                                                                                                                  |
| `getPath`     | Absolute folder the type deploys to. Returning `undefined` drops the type from `getModPaths()`, so its mods are neither deployed nor purged (Collections registers its type this way: it exists for every game but never deploys). |
| `test`        | Receives the installer's full instruction list. Only called during auto-detection.                                                                                                                                         |

---

## How a mod gets its type

1. The installer's instructions run. A `setmodtype` instruction (`INSTALLER_SYSTEM.md`) sets the type directly.
2. If the mod's type is still `""` after the install, `determineModType` runs: the game's supported types are sorted by `priority` ascending and each type's `test(instructions)` is awaited in turn. **The first `true` wins**; a test that throws is logged and skipped. No match leaves the type `""`.
3. The user can change the type at any time through the Mods table's **Mod Type** column (hidden by default). Its dropdown lists every type whose `isSupported` passes for the active game, labelled `options.name` or the raw id. `setModType` flags the game for deployment.

So `test` is a safety net for mods whose installer did not set a type, typically mods installed by Vortex's own FOMOD or fallback installers. Repo templates set `setmodtype` explicitly and mostly register `() => Promise.resolve(false)` tests, which never claim anything.

---

## `IModTypeOptions`

| Option                       | Default         | Effect                                                                                                                                                                                                                                                                                 |
| ---------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                       | id              | Label in the Mod Type column and its dropdown.                                                                                                                                                                                                                                         |
| `mergeMods`                  | game's value    | Overrides `IGame.mergeMods` for this type (`genSubDirFunc`). `true` = all mods share the target folder; `false` = each mod deploys into `<target>\<mod id>`; a function returns the per-mod subfolder. The game's own value defaults to `true` when unset.                         |
| `deploymentEssential`        | `true`          | When the selected deployment method reports it cannot deploy this type, `true` makes that an **error** (the method is unavailable for the game); `false` downgrades it to a warning and deployment continues (`allTypesSupported`).                                                    |
| `noConflicts`                | `false`         | Mods of this type are left out of file-conflict detection entirely (`MOD_CONFLICTS.md`).                                                                                                                                                                                              |
| `customDependencyManagement` | `false`         | Vortex still shows a mod's unfulfilled dependencies but no longer installs them itself. Written for Collections; Vortex's own comment doubts it is useful elsewhere.                                                                                                                  |

---

## Ordering: detection vs deployment

The two orders are independent:

| Order           | Decided by                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Auto-detection  | `priority`, ascending                                                                            |
| Deployment pass | Registration order, with the default type `""` always last (`VORTEX_DEPLOYMENT.md`)              |

Priority never reorders deployment, and registration order never affects detection.

---

## Mod types bundled with Vortex

These are registered by bundled extensions, so they exist alongside a game extension's own types and can claim its mods:

| Type id                 | Priority | Supported for                                                                                                  | Target           | `test` claims                                                                                                                  |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `dinput` ("Engine Injector") | 100 | **Every game** except Factorio and MSFS, unless `compatible.dinput === false` or `compatible.deployToGameDirectory === false` | Game folder      | Any instruction whose `destination` is exactly `dinput8.dll`. Shows a "dlls can damage your system" dialog first; Cancel aborts the install |
| `enb`                   | 100      | Same rule, with `compatible.enb`                                                                               | Game folder      | Never (`test` always false; user-assigned only)                                                                               |
| `gedosato`              | 50       | Games in its own support table                                                                                 | GeDoSaTo texture folder | Texture-only archives                                                                                                      |
| `dazip` ("Dragon Age AddIn") | 25  | Dragon Age: Origins and Dragon Age 2                                                                          | AddIns folder    | Never (its own installers set the type)                                                                                        |
| BepInEx types           | 10–13    | Games registered with the BepInEx extension's support map (not Valheim)                                        | BepInEx folders  | BepInEx layouts                                                                                                                |
| `umm`                   | 15       | Games registered with the UMM extension's support map                                                          | none (`undefined`) | UMM app archives                                                                                                            |
| `collection`            | 200      | Every game                                                                                                     | none (`undefined`) | Never                                                                                                                        |

The `dinput` row matters for any game whose default target is not the game root: a mod that reaches auto-detection with a top-level `dinput8.dll` is retyped to `dinput` and deployed into the game folder, after the user confirms the DLL warning. Set `compatible: { dinput: false, enb: false }` on the game to opt out (`REGISTER_GAME.md`). The flags remove the mod types only: the bundled `dinput` **installer** (priority 50) has no game check, claims any archive containing a `dinput8.dll` that no lower-priority installer took, copies the files next to the game executable and sets no type. It and the `gedosato` installer are listed in `INSTALLER_SYSTEM.md`'s priority reference.

---

## Helpers

```js
util.getModType(typeId)   // IModType | undefined; undefined for "" and for unregistered ids
game.getModPaths(gamePath) // { [typeId]: absolutePath } for supported types with a defined path, "" included
game.modTypes              // IModType[] supported for this game, registration order
```

`IModType` = `{ typeId, priority, isSupported, getPath, test, options }`.

---

## Gotchas

- **Unregistered type = invisible mod.** A mod whose `type` no loaded extension registers is never deployed and its previously deployed files are never purged (`VORTEX_DEPLOYMENT.md`).
- **Changing `getPath` orphans deployments.** The manifest is read only from the type's current target folder.
- **`isSupported` gated on discovery** (the repo template pattern) means the type disappears while the game is undiscovered, with the same effect as an unregistered type.
- **`deploymentEssential` defaults to blocking.** A type pointing at a different drive than staging can make hardlink deployment unavailable for the whole game. Set `deploymentEssential: false` only when the game still works without that type's files.

---

## See also

`REGISTER_GAME.md` (`compatible` flags, `mergeMods`). `INSTALLER_SYSTEM.md` (`setmodtype`, priority reference). `VORTEX_MOD_INSTALL.md` (where type assignment sits in the install pipeline). `VORTEX_DEPLOYMENT.md` (per-type deployment passes, type changes that delete files). `MOD_CONFLICTS.md` (`noConflicts`, cross-type conflicts). `USER_CONFIGURABLE_MOD_PATHS.md` (types whose `getPath` reads a user setting). `TEMPLATES_OVERVIEW.md` (template priority bands). `VORTEX_MOD_LIST.md` (the Mod Type column).
