# Vortex Deployment (runtime)

How the app makes **staged** mods actually present in the game folder, and how it removes them
again (purge). Deployment is the step **after** install (`VORTEX_MOD_INSTALL.md`). The
`IDeploymentMethod` contract and the deployment-manifest shape are the authoring view: see
`DEPLOYMENT_MANIFEST.md` and `REGISTER_MERGE.md`.

Drivers: `mod_management/modActivation.ts` (`deployMods`), `mod_management/util/deploy.ts`
(purge), `mod_management/util/deploymentMethods.ts` (activator registry), orchestration in
`mod_management/index.ts`.

## Activators (deployment methods)

Deployment is pluggable. Each method is an `IDeploymentMethod` registered with
**`registerDeploymentMethod(activator)`**, which pushes into a module-level `activators` array and
re-sorts it ascending by `priority` (`byPriority = lhs.priority - rhs.priority`).

| Activator                          | priority | Mechanism      | Notes                                                                                                                            |
| ---------------------------------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `null_activator`                   | 3        | no-op          | For games that read mods straight from staging; only "supported" when the game opts in. Does **not** extend `LinkingDeployment`. |
| `hardlink_activator`               | 5        | hard links     | The usual default. Requires staging + game on the **same volume**.                                                               |
| `symlink_activator` (+ `_elevate`) | 10       | symbolic links | `_elevate` variant runs an elevated helper for permission-restricted targets.                                                    |
| `move_activator`                   | 50       | moves files    | Cross-volume; no link support.                                                                                                   |

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

## External changes

Before each deployment, `dealWithExternalChanges` compares the game folder against the last
manifest and decides what to do about anything that changed outside Vortex. The repo's own deep
dive is `docs/mod-management/EXTERNAL-CHANGES.md`; code in `mod_management/util/externalChanges.ts`,
the dialog in `views/ExternalChangeDialog.tsx`.

```text
activator.externalChanges()        per mod type -> IFileChange[]
  -> classifyExternalChange()      merged | autoResolved | rest
  -> existingSourceFolders()       which mod folders are still in staging
  -> changeToEntry()               IFileEntry with its preselected action
  -> showExternalChanges(entries)  fills state.session.mods.changes, opens the dialog
  -> setExternalChangeAction()     user edits
  -> confirmExternalChanges()      resolves the promise
  -> applyFileActions()            file operations, updated manifest
```

### Change types

| Type         | What happened                                                              | Default action                                                                          |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `refchange`  | The deployed file was replaced or rewritten (another tool, the game, by hand) | `newest` — keep whichever side has the newer timestamp                                  |
| `valchange`  | The bytes changed in place through a hard link, so both sides already agree | `nop` (never shown in the dialog)                                                       |
| `deleted`    | The deployed link was removed from the game folder; staging still has it   | `restore` — drop it from the manifest so the next deployment re-creates it              |
| `srcdeleted` | The staging file is gone but the deployed copy remains                     | `import` (move it back into staging) while the mod's staging folder exists, else `drop` |

"Save" in the dialog means accept the external change as permanent; "Revert" means undo it.
`refchange` offers `drop` (revert to the staging file), `import` (copy the game-folder file over the
staging one) and `newest`. `deleted` offers `restore` or `delete` — the latter removes the staging
file too and asks for confirmation when more than one file is affected. `srcdeleted` offers `import`
or `drop`. The dialog groups entries by source mod by default and can list individual files.

### Silent resolution

Two buckets never reach the dialog and resolve with the internal defaults (`refchange` → `drop`,
`valchange` → `nop`, `deleted` → `restore`, `srcdeleted` → `drop`), treating staging as the source
of truth:

- **Merged files** — sources under the `__merged` folder (`MERGED_PATH`).
- **Expected changes** — a collection install is running, or the change belongs to a mod Vortex
  itself just touched (its folder is in the deployment's `recentChanges`, e.g. after an update or
  reinstall).

`EXTERNAL-CHANGES.md` describes the second trigger as an `autoResolveAll` setting; no such flag exists
in the code — the decision is `classifyExternalChange(change, { isInstallingCollection,
recentChanges })`.

Two of these defaults are recent: the "keep mod files by default" change (first in
v2.10.0-beta.1) made `deleted` default to `restore` and `srcdeleted` to `import` while the mod
folder exists. Earlier releases preselected `delete` for `deleted` — the destructive choice that
also removes the staging file — and `drop` for every `srcdeleted` entry.

## Events (runtime)

| Event                                                     | Direction      | Purpose                            |
| --------------------------------------------------------- | -------------- | ---------------------------------- |
| `will-deploy` (profileId, lastDeployment, opts)           | `emitAndAwait` | Pre-deploy hook (may change state) |
| `did-deploy` (profileId, newDeployment, progressCB, opts) | `emitAndAwait` | Post-deploy hook                   |
| `mods-did-deploy` (profileId, newDeployment)              | emit           | Fire-and-forget post-deploy        |
| `deploy-single-mod`                                       | `onAsync`      | Deploy one mod                     |
| `purge-mods` (allowFallback, cb)                          | on             | Purge everything                   |
| `purge-mods-in-path` (gameId, modType, modPath)           | `onAsync`      | Targeted purge                     |
| `await-activation` (cb)                                   | on             | Wait for any in-flight deployment  |

## Deployment fixes first shipped in v2.10.0-beta.1

None of these commits is in v2.9.0 or any earlier tag; all five first ship in v2.10.0-beta.1
(checked 2026-10-21). A user on the stable line does not have them yet.

- **A game file's backup is never overwritten.** When a link deployment moves a game file aside to
  `<file>.vortex_backup` and that backup name is already taken (a second mod type deploying over the
  same file), the file is left undeployed and recorded as a deployment failure instead of renaming
  over the backup of the game's original file.
- **Skip patterns match dot-files.** The deployment blacklist compiles its patterns with `dot: true`,
  once per deployment instead of once per file, so `._*` files inside an archive's `__MACOSX` folder
  and junk under a dot-prefixed folder stay out of the game folder. A pattern that cannot be compiled
  is dropped with a warning instead of failing the deployment.
- **Deploying one mod keeps the rest.** A single-mod redeploy (`deploy-single-mod`) now applies the
  mod's rules and file overrides, keeps the files of mods sorted after it and of the merged output,
  and sorts the mod in even when it is not enabled yet (the script-extender-download case).
- **A failed deployment cancels a profile switch.** `IDeployOptions.failOnError` is new: the
  profile switch asks its deployments for their error, cancels on one, marks the game as needing a
  deployment and offers to switch back. (`IDeployOptions.profileId` is gone from the published API
  report at the same point.)
- **Fallback purge works at the file's real path.** It reads the staging backup by its file name,
  removes files from the mod's subfolder for games that do not merge mods, keeps files older than the
  copy it deployed, asks before purging files of a `move` or unknown deployment method, and records
  the files it leaves behind in the manifest. The External Changes dialog applies Revert and Save at
  each file's deployed path.
- **Mod undeploys run one at a time.** Each undeploy rewrites the manifest it loaded, so removing
  several mods at once no longer has two removals write the manifest over each other.
- **The modern layout says "apply" for deploy.** The auto-deploy switch, the deployment method panel
  and the mods toolbar menu say Apply, and the toolbar's own Deploy button is gone. The classic
  layout keeps its wording. Event names (`will-deploy`, `did-deploy`) and the API are unchanged, so
  extension notifications that tell users to "deploy" still work but no longer match the label.

v2.10.0-beta.2 adds `state.persistent.deployment.purged[gameId]`: set to `true` after a purge that
succeeded and was not cancelled, back to `false` after the next deployment. The
`purged(state)` selector in `mod_management/selectors.ts` reads it for the active game, and
`setDeploymentPurged(gameId, purged)` is the action. A game extension can use it to tell "purged,
waiting for a deploy" apart from a normal state, for example when deciding whether to write a load
order file back (see `VORTEX_LOAD_ORDER.md`, "A purge followed by a deploy writes nothing back").

## Gotchas

- `hardlink_activator` needs staging and game on the same volume; otherwise it's not supported and
  Vortex falls back (e.g. to `move_activator`).
- Deployment is serialized by the activation lock — `await-activation` exists for callers that
  must wait.
- The manifest is the source of truth for "what Vortex owns"; editing the game folder by hand
  surfaces as an external change on the next deploy.
- `null_activator` (priority 3) is preferred _by number_ but only reports supported for opt-in
  games, so it doesn't pre-empt hardlink in normal cases.

## See also

Runtime siblings: `VORTEX_MOD_INSTALL.md`, `VORTEX_PROFILES.md`, `VORTEX_GAME_LIFECYCLE.md`,
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring: `DEPLOYMENT_MANIFEST.md`,
`REGISTER_MERGE.md`. Contributing a change here: `VORTEX_CONTRIBUTING.md`. Link mechanics behind each activator (hard links, symlinks, elevation,
per-method purge): `NTFS_LINKS.md`. Diagram of deploy/purge: `VORTEX_FLOWCHARTS.md` §4. Third-party purge trigger that leaves
`deploymentNecessary` set without re-deploying: `STEAM_FILE_DOWNLOADER.md`. A worked case of a mod
type target chosen to keep mods on the staging volume so hardlinks stay available: `RESOREP.md`.
