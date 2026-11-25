# Mod File Conflicts

How Vortex detects that two mods ship the same file, when a conflict counts as resolved, how resolution becomes deployment behaviour, and what a game extension controls.

Conflict detection lives in the bundled `mod-dependency-manager` extension (`extensions/mod-dependency-manager/src/`): `util/conflicts.ts` (detection), `util/blacklist.ts` (ignored files), `util/findRule.ts` (`isConflictResolved`), `util/fileOverrides.ts` (per-file winners), `unsolvedConflictsCheck.ts` (launch gate), `index.tsx` (triggers, notification). Deploy-time winner selection is in `VORTEX_DEPLOYMENT.md`.

---

## Detection

`checkConflictsAndRules` runs for the **active game only** and returns early when:

- the game has no extension (`getGame` undefined) or is undiscovered, or
- **`IGame.mergeMods === false`**: every mod deploys into its own subfolder, so Vortex assumes no conflicts are possible. A `mergeMods` function is still scanned.

Otherwise it takes every mod **enabled in the active profile**, drops mods whose type sets `noConflicts: true` (`MOD_TYPES.md`), and walks each mod's **staging** folder (`turbowalk`). Each file is mapped to the path it would deploy to:

```text
<mod type target from getModPaths()>[\<per-mod subfolder if the type/game doesn't merge>]\<activator.getDeployedPath(path inside the mod)>
```

That is an **absolute** path, lowercased for comparison. Two mods conflict when they map a file to the same key, so mods of different types collide when their targets overlap, and a mod whose type is not registered falls back to the default type's target. Mods whose staging folder is missing are logged and skipped.

Files matching the ignore list are dropped before pairs are built. The list is the built-in set plus the game's `details.ignoreConflicts` strings, tested with case-insensitive minimatch (`dot: true`) against that absolute key:

```js
// built-in, cannot be removed by an extension
path.join("**", "fomod", "*"), path.join("**", "readme*"), path.join("**", ".git", "**"),
path.join("**", ".hgignore"), path.join("**", ".gitignore"), path.join("**", ".gitattributes"),
path.join("**", "_macosx", "**", "*"), path.join("**", "meta.ini"), path.join("**", "mod.manifest"),
```

Because the key is absolute, only `**`-prefixed patterns are useful in `ignoreConflicts`; a depth-limited pattern such as `path.join("*", "x.json")` never matches. The game's list is cached per game id, so a change to `details.ignoreConflicts` after the first scan is only seen once another game has been scanned. Conflict detection reads staging, not the game folder, so a file kept out of deployment by `ignoreDeploy` still conflicts unless `ignoreConflicts` covers it too (`REGISTER_GAME.md`).

Each conflict pair carries a **suggestion** from the files' modification times: the mod with the older file is suggested to load `before` the other. Mixed results across the shared files give no suggestion. The result is stored in `session.dependencies.conflicts` as `{ [modId]: IConflict[] }` where `IConflict = { otherMod, files, suggestion }`.

---

## When it reruns

The recalculation is debounced and suppressed while a collection installs. It is scheduled by:

| Trigger                                         | Also recomputes file overrides |
| ----------------------------------------------- | ------------------------------ |
| `did-deploy`                                    | no                             |
| Mods enabled/disabled (`will-enable-mods`), a mod's state changing | yes          |
| `gamemode-activated`, `profile-did-change`      | no                             |
| `did-install-collection`                        | yes                            |
| `recalculate-modtype-conflicts` (`(modIds)`)   | yes                            |
| `update-conflicts-and-rules` (`(calculateOverrides)`, awaitable) | caller decides |

An extension that changes files in staging (or retypes mods) and needs the conflict state current right away can `await api.emitAndAwait("update-conflicts-and-rules", true)`.

---

## Resolved vs unresolved

A conflict between mods A and B is **resolved** when either mod has a `before`, `after` or `conflicts` rule referencing the other (`isConflictResolved`, both directions), or when a rule exists between them in the dependency rule cache. The rule types and how to add one are in `MOD_RULES.md`. The Mods table's Dependencies column shows a conflict icon per mod; clicking it opens the conflict editor, which writes those rules.

While any conflict is unresolved:

- A persistent warning notification "There are unresolved file conflicts" (not dismissable) lists each mod and its partners.
- **Launching the game is blocked.** A start hook (`check-unsolved-conflicts`, priority 50) shows "Unresolved Conflict" and cancels the launch, unless the launch passes `suggestDeploy: false` in its run options. `GAME_LAUNCHING.md` covers the start-hook chain.

---

## From rules to deployed files

Rules decide mod order (`doSortMods`), and within one mod type the later mod's copy wins because earlier ones skip files listed in their `fileOverrides`. `mod.fileOverrides` is the list of files a mod **gives up**, despite the action's comment calling them files the mod always provides. The **Manage File Conflicts** mod action opens a separate dialog (`OverrideEditor`) where the user picks a provider per file, which sets those lists directly (`actions.setFileOverride(gameId, modId, files)`).

When file overrides are recomputed (the table above) and `settings.workarounds.modTypeConflictsEnabled` is on (default; toggled on the Workarounds settings page), `planOverrideUpdate` assigns each shared file to exactly one enabled mod: the one already deploying it, otherwise the one the load order puts last, and adds the file to every other sharer's `fileOverrides`. Overrides for files no other enabled mod ships are removed. When a changed override involves mods of different types, Vortex purges before deploying, because type passes run one after another. Detail: `VORTEX_DEPLOYMENT.md` "Conflict resolution".

The `check-file-override-redundancies` event (`(gameId, { [modId]: files[] })`) and a `redundant-file-overrides` test (`registerTest`, run on `gamemode-activated`) remove overrides naming files that no longer exist in a mod's staging folder.

---

## What a game extension controls

| Lever                                     | Effect                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `details.ignoreConflicts`                 | Extra ignore patterns; use `**`-prefixed globs                                                       |
| `mergeMods: false` (game)                 | Detection skipped entirely for the game                                                              |
| Mod type `mergeMods` / `noConflicts`      | Per-type subfolders (fewer key collisions) / type left out of detection                              |
| Mod type targets                          | Two types whose targets overlap produce cross-type conflicts                                         |
| `rule` instructions from an installer     | Pre-resolve a known conflict with a `before`/`after` rule (`MOD_RULES.md`)                           |
| Load order (`registerLoadOrder`)          | Does **not** resolve file conflicts; it orders the game's own load list, not deployment             |

---

## See also

`VORTEX_DEPLOYMENT.md` (skip sets, cross-type winner selection, purge-first). `MOD_RULES.md` (rule types, adding rules). `MOD_TYPES.md` (`noConflicts`, `mergeMods`, type targets). `REGISTER_GAME.md` (`ignoreConflicts` vs `ignoreDeploy`). `GAME_LAUNCHING.md` (start hooks). `EVENTS.md` (conflict events). `VORTEX_STATE.md` (where `session.dependencies` sits). `VORTEX_LOAD_ORDER.md` (why load order is separate from file conflicts).
