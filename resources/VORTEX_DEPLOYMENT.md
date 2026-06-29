# Vortex Deployment (runtime)

How the app makes **staged** mods actually present in the game folder, and how it removes them
again (purge). Deployment is the step **after** install (`VORTEX_MOD_INSTALL.md`). The
`IDeploymentMethod` contract and the deployment-manifest shape are the authoring view: see
`DEPLOYMENT_MANIFEST.md`, `REGISTER_MERGE.md` and memory `reference_deployment_manifest` /
`reference_register_merge`.

Drivers: `mod_management/modActivation.ts` (`deployMods`), `mod_management/util/deploy.ts`
(purge), `mod_management/util/deploymentMethods.ts` (activator registry), orchestration in
`mod_management/index.ts`.

## Activators (deployment methods)

Deployment is pluggable. Each method is an `IDeploymentMethod` registered with
**`registerDeploymentMethod(activator)`**, which pushes into a module-level `activators` array and
re-sorts it ascending by `priority` (`byPriority = lhs.priority - rhs.priority`).

| Activator | priority | Mechanism | Notes |
| --- | --- | --- | --- |
| `null_activator` | 3 | no-op | For games that read mods straight from staging; only "supported" when the game opts in. Does **not** extend `LinkingDeployment`. |
| `hardlink_activator` | 5 | hard links | The usual default. Requires staging + game on the **same volume**. |
| `symlink_activator` (+ `_elevate`) | 10 | symbolic links | `_elevate` variant runs an elevated helper for permission-restricted targets. |
| `move_activator` | 50 | moves files | Cross-volume; no link support. |

All except `null` extend `LinkingDeployment` / `LinkingActivator`.

### Choosing the activator

- `getSupportedActivators(state)` — activators whose `allTypesSupported(...)` returns **no
  errors** for the active game's modtypes.
- `getSelectedActivator(state, gameId)` — the user's choice (`state.settings.mods.activator[gameId]`).
- `getCurrentActivator(state, gameId, allowDefault)` — the selected one, or (if `allowDefault`)
  the **lowest-priority-number** supported activator, **preferring one with no warnings** over one
  with warnings. Returns `undefined` if the game isn't discovered or the selected activator is no
  longer supported.

## Deploy orchestration

Triggered by `mods-enabled` / `mod-enabled` (debounced), on `gamemode-activated`, and manually.
The whole sequence runs **inside an activation lock** (so two deployments can't overlap), in
`mod_management/index.ts`:

1. Load the previous deployment (manifest) per modtype → `lastDeployment[typeId]`.
2. **`will-deploy`** (`emitAndAwait`, profileId, lastDeployment, deployOptions) — handlers may
   disable mods or adjust state.
3. **Re-read the profile** — a `will-deploy` handler may have changed mod enablement, so the
   updated profile is picked up before continuing.
4. **`dealWithExternalChanges`** (`util/externalChanges.ts`) — detect files changed/added in the
   game folder outside Vortex (compared against the manifest) and ask the user how to reconcile.
5. **`checkIncompatibilities`** — warn on known-incompatible mods.
6. **`doSortMods`** — order mods (mod rules / load order) so conflict winners are deterministic.
7. **`doMergeMods`** — run `registerMerge` producers, writing outputs into the merged folder.
8. **`validateDeploymentTarget`** + **`deployAllModTypes`** → `deployMods` per modtype.
9. Activation lock releases.
10. **`did-deploy`** (`emitAndAwait`) + **`mods-did-deploy`** emit — post-deploy handlers.
11. `bakeSettings` (game settings/INI), then `setDeploymentNecessary(gameId, false)`.

### `deployMods` (per modtype)

`mod_management/modActivation.ts`:

1. `ensureWritable(api, destinationPath)` → `getNormalizeFunc(destinationPath)`.
2. `method.prepare(destinationPath, true, lastActivation, normalize)`.
3. For each enabled mod (progress 0→50%): add the mod's `fileOverrides` to `skipFiles` (so a
   higher-priority mod's file wins — conflict resolution), then
   `method.activate(modPath, mod.installationPath, subDir(mod), skipFiles)`.
4. Activate the **merged** folder: `MERGED_PATH` (or `MERGED_PATH + "." + typeId`) holding the
   `registerMerge` outputs, with an empty skip set.
5. `method.finalize(gameId, destinationPath, installationPath, cb)` (progress 50→100%) → returns
   the new **deployment manifest** (`IDeployedFile[]`). On error, `method.cancel(...)` if defined.

## Conflict resolution

When two mods ship the same file, the winner is decided by **mod order** (`doSortMods`, from mod
rules / load order). The mechanism: each mod's `fileOverrides` are added to the shared `skipFiles`
set, so once a higher-priority mod has placed a file, lower-priority mods skip it.

## Manifest, external changes, purge

- The **manifest** (`IDeployedFile[]`, returned by `finalize`) records exactly what Vortex put in
  the game folder. It lets Vortex redeploy, detect **external changes** (`externalChanges.ts`),
  and purge cleanly. Shape + caching: `DEPLOYMENT_MANIFEST.md`.
- **Purge** — `util/deploy.ts` `purgeMods(...)` / `purgeModsInPath(...)` (both under
  `withActivationLock`) read the manifest(s) (`loadAllManifests`) and remove everything Vortex
  deployed, restoring the game folder. `genSubDirFunc(game, modType)` maps mods to subdirs.
  Always **purge before** switching activators or profiles.

## Events (runtime)

| Event | Direction | Purpose |
| --- | --- | --- |
| `will-deploy` (profileId, lastDeployment, opts) | `emitAndAwait` | Pre-deploy hook (may change state) |
| `did-deploy` (profileId, newDeployment, progressCB, opts) | `emitAndAwait` | Post-deploy hook |
| `mods-did-deploy` (profileId, newDeployment) | emit | Fire-and-forget post-deploy |
| `deploy-single-mod` | `onAsync` | Deploy one mod |
| `purge-mods` (allowFallback, cb) | on | Purge everything |
| `purge-mods-in-path` (gameId, modType, modPath) | `onAsync` | Targeted purge |
| `await-activation` (cb) | on | Wait for any in-flight deployment |

## Gotchas

- `hardlink_activator` needs staging and game on the same volume; otherwise it's not supported and
  Vortex falls back (e.g. to `move_activator`).
- Deployment is serialized by the activation lock — `await-activation` exists for callers that
  must wait.
- The manifest is the source of truth for "what Vortex owns"; editing the game folder by hand
  surfaces as an external change on the next deploy.
- `null_activator` (priority 3) is preferred *by number* but only reports supported for opt-in
  games, so it doesn't pre-empt hardlink in normal cases.

## See also

Runtime siblings: `VORTEX_MOD_INSTALL.md`, `VORTEX_PROFILES.md`, `VORTEX_GAME_LIFECYCLE.md`,
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring: `DEPLOYMENT_MANIFEST.md`,
`REGISTER_MERGE.md`. Memory: `reference_vortex_deployment`.
