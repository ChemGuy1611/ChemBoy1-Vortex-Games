# NTFS Links and Vortex Deployment

What Windows actually provides in the way of filesystem links, which of them each Vortex deployment
method creates, and the probes and gates Vortex uses to decide which methods are available.

This is the layer underneath `VORTEX_DEPLOYMENT.md` — that doc covers the surrounding pipeline
(event order, conflict resolution, manifest handling); this one covers the link mechanics.

---

## Windows link types

| | Hard link | Symbolic link | Directory junction |
| --- | --- | --- | --- |
| Windows API | `CreateHardLinkW` | `CreateSymbolicLinkW` | reparse point set via `DeviceIoControl` |
| `mklink` flag | `/H` | none (files) / `/D` (dirs) | `/J` |
| Can target | files only | files or directories | directories only |
| Target path form | n/a — points at the data | absolute, relative, or UNC | absolute local path only |
| Cross-volume | no | yes | yes |
| Privilege to create | none | `SeCreateSymbolicLinkPrivilege`, or Developer Mode | none |
| Can dangle | no | yes | yes |
| Detectable by an app | no | yes (reparse tag) | yes (reparse tag) |
| Node API | `fs.link` | `fs.symlink` | `fs.symlink(src, dst, 'junction')` |

Hard links and symbolic links are NTFS features. FAT32 and exFAT support neither — that is the
reason Vortex ships a move-based method at all.

### Hard links

A hard link is a second directory entry pointing at the same MFT record. There is no "original":
after creation both names are equal peers and the file data survives until the last name is
deleted. Because the record is shared, size, timestamps, attributes and the security descriptor are
shared as well — although Explorer can show stale cached values for one name until it is touched.

Constraints:

- Same volume only. There is no cross-volume form.
- Files only, never directories.
- NTFS caps a file at 1024 names (1023 additional links).
- `fsutil hardlink list <file>` enumerates every name a file has.

Two behaviours cause most of the confusion around them:

- **Disk-space and backup tools double-count.** Each name looks like a full file to anything that
  walks directories, so a backup can store N copies of one blob and a space analyser can report a
  staging folder and a game folder that together use twice the real space.
- **Copying or moving across volumes silently breaks the link.** Any tool that copies a tree —
  including moving a folder to a different drive — writes independent files. Vortex handles this
  case explicitly: if the game folder moved since deployment, its hard links are now ordinary files
  and a link-based purge would find nothing to clean (see [Purge, per method](#purge-per-method)).

How a program writes to the file matters. An in-place write is visible through every name; a
delete-and-recreate — the common "safe save" pattern — replaces one directory entry with a brand
new file and quietly detaches it from the others.

### Symbolic links

A symlink is a reparse point (`IO_REPARSE_TAG_SYMLINK`) holding a path. The filesystem resolves it
on open, so an application reads and writes the target unless it deliberately opens the link itself
with `FILE_FLAG_OPEN_REPARSE_POINT`.

- File and directory flavours are distinct and fixed at creation
  (`SYMBOLIC_LINK_FLAG_DIRECTORY`). Node picks the flavour from the target when the `type` argument
  is omitted.
- The target may be relative or absolute, on another volume, or a UNC path, and it does not have to
  exist — dangling symlinks are legal.
- Creating one requires `SeCreateSymbolicLinkPrivilege`, which by default only administrators hold.
  Windows 10 1703 and later allow unprivileged creation when Developer Mode is on and the caller
  passes `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE`.
- Cross-machine evaluation (remote link to remote target, and similar combinations) is disabled by
  default; `fsutil behavior query SymlinkEvaluation` reports the current policy.
- Applications *can* tell a symlink apart from a real file. Some games, launchers and anti-cheat
  layers refuse to load through one, which is the main practical downside.

### Directory junctions

A junction is a reparse point on a directory (`IO_REPARSE_TAG_MOUNT_POINT`) whose target must be an
absolute local path. It needs no privilege, which is why it is the usual hand-rolled trick for
relocating a game or staging folder onto another drive.

Vortex never creates junctions, and one will not work around the hardlink volume constraint:
`stat` follows reparse points, so the device id reported for a path that runs through a junction is
that of the volume the junction points at, not the volume the junction lives on.

---

## What each deployment method creates

| Method (id) | Priority | Creates | Same volume | Elevation | `canRestore()` | Fallback-purge safe |
| --- | --- | --- | --- | --- | --- | --- |
| Null (`null-deployment`) | 3 | nothing | n/a | no | n/a | yes |
| Hardlink (`hardlink_activator`) | 5 | one hard link per file | required | no | yes | yes |
| Symlink (`symlink_activator`) | 10 | one file symlink per file | not required | privilege required | no | yes |
| Symlink elevated (`symlink_activator_elevated`) | 20 | one file symlink per file | not required | UAC per deploy, or a task | no | yes |
| Move (`move_activator`) | 50 | moves the file, leaves a `.vortex_lnk` stub | required in practice | no | yes | no |

Every method except the null one extends `LinkingDeployment`, which owns the deploy/purge skeleton
and delegates to the subclass: `linkFile`, `unlinkFile`, `isLink`, `purgeLinks` and `canRestore`.

`canRestore()` reports whether the method can put a file back after the *staging* copy is deleted.
True for hard links (the data survives under the game-folder name) and for move deployment (the
file is physically there); false for symlinks (deleting the source leaves a dangling link). It
drives whether external-change handling offers a source-deleted file as restorable.

### Hardlink deployment

- Link: `fs.link(source, dest)`. On `EEXIST`, remove the destination and retry once.
- Link test: `linkStats.nlink > 1 && linkStats.ino === sourceStats.ino`. There is no reparse tag to
  read, so file identity is the only available test.
- Availability: write access to the mod path, then `fs.statSync(staging).dev` compared against
  `fs.statSync(modPath).dev`. On a mismatch the unavailable-reason carries a `fixCallback` that
  opens Settings → Mods and highlights the staging-path control, naming the game's volume via
  `winapi.GetVolumePathName()`.
- Filesystem probe: writes `__vortex_canary.tmp` into the staging folder and `fs.linkSync`s it to
  `__vortex_canary.tmp.link`. Any error except `EMFILE` reports "Filesystem doesn't support hard
  links". Both canaries are then deleted; if deletion fails — almost always an anti-virus holding
  the freshly created file — it retries once after 100 ms and logs if that also fails.

### Symlink deployment

- Link: `fs.symlink(source, dest)` with an absolute target into staging. On `EEXIST`, remove and
  retry.
- Link test: `fs.readlink(dest) === sourcePath`. `readlink` on a non-link throws (`EINVAL` on
  current Electron; historically an unhelpful "unknown" error), which is caught as "not a link".
- Privilege probe: `ensureAdmin()` symlinks a file known to exist in Vortex's userData folder to
  `__link_test`, then deletes it. Failure means the account lacks the privilege and the method
  reports "Requires admin rights on windows."
- Filesystem probe: the same canary pair, but created with `symlinkSync` and placed in the **mod
  path** rather than staging — the destination filesystem is the one that has to support links.
  `EMFILE` is ignored. The error code Windows actually returns when symlinks are unsupported is
  `EISDIR`, which the code special-cases.
- Hard-coded exclusions: every Gamebryo game (`morrowind`, `oblivion`, `skyrim`, `enderal`,
  `skyrimse`, `skyrimvr`, `fallout3`, `fallout4`, `fallout4vr`, `falloutnv`), plus `nomanssky`,
  `stateofdecay`, and — on Windows only — `factorio`.

### Elevated symlink deployment

Identical on-disk result, different executor: the links are created by a separate elevated process.

- `finalize()` starts the elevated helper, runs the whole link/unlink batch through it, then stops
  it. Purge does the same around its walk.
- IPC is a named pipe (`\\?\pipe\vortex_elevate_symlink…`) speaking `json-socket`. The helper body
  is serialised with `.toString()` and injected into the elevated process, so it cannot import
  modules — it uses `require` inline and retries `EPERM`, `EBUSY`, `EIO`, `EBADF` and `UNKNOWN` up
  to five times, 100 ms apart.
- Each operation is a numbered request with a 5 s timeout, retried up to three times.
- After a batch the elevated process is kept alive for 5 s — or 5 minutes while a collection
  install session is active — so a burst of deployments does not produce a burst of UAC prompts.
- While waiting for consent, Vortex sets a UI blocker and polls the process list for `consent.exe`,
  bringing its window to the front. If it disappears without the helper ever connecting, the deploy
  is cancelled with a "system refused or failed to elevate" message.
- `isSupported` deliberately reports *unavailable* when the account already holds the privilege
  ("no need to use the elevated variant"). `FORCE_ALLOW_ELEVATED_SYMLINKING=true` overrides that
  for testing.
- It cannot run the filesystem probe — creating the test link would itself need elevation — so an
  unsupported filesystem surfaces mid-deploy as a "Symlinks are not supported" notification.

Two workarounds sit in Settings → Workarounds:

1. **Grant the privilege.** An elevated helper calls
   `winapi.AddUserPrivilege(sid, 'SeCreateSymbolicLinkPrivilege')` (`RemoveUserPrivilege` to undo)
   and verifies with `GetUserPrivilege`. It takes effect after a logout or reboot, after which the
   plain symlink method becomes available and the elevated one reports itself unnecessary. Vortex
   reads the current effective state at startup with `winapi.CheckYourPrivilege()`.
2. **Scheduled task** (the pre-1.4.3 mechanism, still selectable). Vortex writes
   `vortexSymlinkService.js` into its userData folder and registers a Task Scheduler task named
   "Vortex Symlink Deployment" with `RunLevel: highest` and `AllowDemandStart`, then triggers it
   with `winapi.RunTask()` instead of prompting. One UAC prompt when the task is created, none
   afterwards. The confirmation dialog also points at Windows Developer Mode as a third option.

### Move deployment

Not an OS link at all. The file is renamed into the game folder and a `<name>.vortex_lnk` JSON stub
(`{"target": "<deployed path>"}`) is left in staging recording where it went, with the original's
mtime copied onto the stub. Purge renames each recorded target back, falling back to a real move on
`EXDEV`.

It works on exFAT and FAT32, but the confirmation dialog shown when it is selected warns that it is
slower, uses more disk space and is less robust than hardlink deployment. Cross-drive it degrades
to real copies. Because the game folder holds the only copy and staging holds only stubs,
`isFallbackPurgeSafe` is false — a manifest-driven purge that just deletes deployed files would
destroy the data.

---

## Gating link support from a game extension

Two equivalent opt-outs, both checked by the symlink methods:

```javascript
// inside the IGame spec
details: { supportsSymlinks: false },  // older field, still honoured
compatible: { symlinks: false },       // generic gate map, preferred
```

`compatible: { moveActivator: false }` and `details.supportsMoveActivator` do the same for move
deployment. `compatible` is a free-form map of gate ids, so further gates can be added over time
without a type change.

Set `symlinks: false` whenever mod files carry internal references to one another or to their own
byte offsets — Unreal Engine IO Store containers (`.pak` plus `.ucas`/`.utoc`), Gamebryo
`.esp`/`.ba2` pairs — or when the engine or its anti-cheat refuses to open a reparse point.
Extensions in this repo drive it from a single toggle near the top of `index.js` (typically
`SYM_LINKS`, forced to `false` when the game's `IO_STORE` toggle is true) and pass it into the spec
as `"supportsSymlinks": SYM_LINKS`.

### Same-volume checks in extensions

Because hardlink deployment needs staging and the game on one volume, an extension that also
deploys to a *third* location — config or save folders under the user profile — has to verify all
three before offering those mod types:

```javascript
function checkPartitions(folder, discoveryPath) {
  if (!preferHardlinks && !IO_STORE) { // symlinks are fine here, so no constraint
    return true;
  }
  try {
    fs.ensureDirSync(discoveryPath);
    fs.ensureDirSync(STAGING_FOLDER);
    fs.ensureDirSync(folder);
    const a = fs.statSync(discoveryPath).dev;
    const b = fs.statSync(STAGING_FOLDER).dev;
    const c = fs.statSync(folder).dev;
    return (a === b) && (b === c);
  } catch {
    return false;
  }
}
```

`stat().dev` is the volume serial number, and the directories have to exist before it can be read —
hence the `ensureDirSync` calls. Since `stat` follows reparse points, a junction pointing at
another drive reports that drive: you cannot junction your way around the constraint.

---

## Files Vortex leaves behind

| Name | Written by | Purpose |
| --- | --- | --- |
| `<file>.vortex_backup` | any linking method | A pre-existing game file renamed out of the way before a link took its place. Restored during purge; if the real name reappeared meanwhile, the user is asked which copy to keep. |
| `__folder_managed_by_vortex` (`.`-prefixed off Windows) | `ensureDir` during deploy | Marks a directory as created by Vortex so purge may remove it once empty. |
| `__delete_if_empty` | older versions | Previous name of the same tag; still recognised. |
| `__vortex_canary.tmp` and `.tmp.link` | support probes | Temporary; deleted immediately, retried once after 100 ms if an anti-virus holds them. |
| `<name>.vortex_lnk` | move deployment only | JSON stub in staging recording where the real file was moved to. |

Directory cleanup honours `game.directoryCleaning`: `'tag'` (the default) removes only directories
carrying the tag file, `'all'` removes any directory that ends up empty.

---

## Purge, per method

| Method | Mechanism |
| --- | --- |
| Hardlink | Walk staging with `turbowalk({ details: true })` collecting `idStr` for every entry with `linkCount > 1`, then walk the game folder and unlink every entry whose `idStr` is in that set. Manifest-independent. `idStr` (a string) is used instead of the numeric `id` because NTFS file ids exceed `Number.MAX_SAFE_INTEGER`. |
| Symlink | Walk the game folder; for each symbolic link, `readlink` it and unlink it if the target resolves inside the staging folder. |
| Symlink elevated | The same walk, but every removal is routed through the elevated helper. |
| Move | Walk staging for `*.vortex_lnk` stubs and rename each recorded target back. |

A manifest-based **fallback purge** deletes exactly what the manifest lists. Vortex switches to it
when the deployed path no longer matches the manifest's `targetPath` — the "game folder was moved,
so the hard links became real files" case — but only when the old method sets
`isFallbackPurgeSafe`.

### Switching methods without a purge

A method may declare `compatible: [<other method ids>]`. If the configured method becomes
unsupported, Vortex looks for a supported method that lists it as compatible and switches to that
one **without purging**, notifying the user. The two symlink methods list each other, since both
leave identical symlinks on disk; nothing else does.

---

## Gotchas

- Hardlink deployment makes deleted staging files look undeletable: removing a mod's file from
  staging does not remove it from the game folder, because the data lives on under that name. That
  is exactly what `canRestore()` reports, and why external-change handling offers to restore from
  the game folder.
- Symlink deployment in the same situation leaves a dangling link instead.
- A game that saves by delete-and-recreate detaches the file from the mod under both hard links and
  symlinks. Vortex sees it on the next deploy as an external change of type `refchange`.
- Anti-virus interference typically shows up as canary files that can be created but not deleted;
  that specific case is logged with its own message.
- `nlink` and `ino` from Node's `stat` are Numbers and can lose precision on NTFS. Where identity
  matters, Vortex uses `stat(path, { bigint: true })` or turbowalk's `idStr`.
- turbowalk's `skipLinks` (default true) stops recursion into junctions but still lists them;
  `isReparsePoint` distinguishes a reparse point from a real entry.
- Purge before switching deployment methods or moving the staging folder. Both link-based purges
  read the current on-disk state, not the manifest, so they only work while that state is intact.

---

## See also

`VORTEX_DEPLOYMENT.md` (the deployment pipeline these methods plug into), `DEPLOYMENT_MANIFEST.md`
(manifest shape, including the recorded `deploymentMethod` and `targetPath`), `REGISTER_GAME.md`
(where `details`/`compatible` live in the game spec), `WINAPI_BINDINGS.md` (`GetVolumePathName`,
the privilege functions, the Task Scheduler functions), `FILE_SEARCH.md` (turbowalk options and
`IEntry` fields the purge walks depend on).
