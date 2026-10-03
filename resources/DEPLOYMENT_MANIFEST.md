# Deployment Manifest

The deployment manifest records what files have been deployed to a game's mod folder. It is written and read by Vortex's deployment system and can be queried by extensions after deployment.

---

## IDeployedFile (line 2424)

```ts
interface IDeployedFile {
    relPath: string; // path relative to game mod folder
    source: string; // mod staging folder name that owns this file
    merged?: string[]; // other sources merged into this file
    target?: string; // per-mod output subfolder; empty when mergeMods is true (NOT the mod type)
    time: number; // deploy timestamp (ms)
}
```

---

## IDeploymentManifest (line 2452)

```ts
interface IDeploymentManifest {
    version: string;
    instance: string;
    deploymentMethod?: string; // activator id (e.g. 'hardlink_activator')
    deploymentTime?: number; // ms timestamp
    stagingPath?: string; // absolute staging directory
    gameId?: string;
    targetPath?: string; // absolute mod folder path
    files: IDeployedFile[];
}
```

---

## On-disk location

One file per mod type, in that type's deploy folder (`game.getModPaths(gamePath)[modType]`):

| File | Where | Read when |
| --- | --- | --- |
| `vortex.deployment.json` (default type) / `vortex.deployment.<modType>.json` | deploy folder | every deploy, purge and `getManifest` |
| `vortex.deployment.<modType>.msgpack` | staging folder | only when the main file fails to parse ("Manifest damaged" dialog) |
| `vortex.deployment.<modType>.json` | staging folder | same fallback, older backup form |

- The file name is the only link to a mod type — the content carries `gameId`, `instance`, `targetPath` and `files`, but no mod-type field. Every deploy/purge path builds the name from the type ids returned by `getModPaths()`.
- Consequence: when a mod type stops being registered for a game, its manifest is never read or purged again, and the files it lists stay on disk. Renaming the file to a still-registered type id that deploys to the same folder hands those files over completely.
- A manifest whose `instance` differs from the running Vortex instance triggers the "Purge files from different instance?" dialog on the next deploy.
- An empty deployment deletes the deploy-folder file and the staging `.msgpack` backup instead of writing an empty manifest.

---

## Reading the manifest

```js
// Expensive — always cache the result within a single handler
const manifest = await util.getManifest(api, modType?, gameId?);
```

| Arg       | Default             | Description          |
| --------- | ------------------- | -------------------- |
| `api`     | required            | IExtensionApi        |
| `modType` | `''` (default type) | Mod type id to query |
| `gameId`  | active game         | Game to query        |

---

## Common patterns

### Check if a specific file is deployed

```js
const manifest = await util.getManifest(api);
const isDeployed = manifest.files.some((f) => f.relPath.toLowerCase() === "mods/mymod.pak");
```

### Find all files from a specific mod

```js
const manifest = await util.getManifest(api);
const modFiles = manifest.files.filter((f) => f.source === mod.installationPath);
```

### Post-deploy processing (did-deploy event)

```js
api.onAsync("did-deploy", async (profileId, deployment) => {
    // deployment may be passed directly — use it if provided to avoid a second fetch
    const manifest = deployment ?? (await util.getManifest(api));
    const relevant = manifest.files.filter((f) => f.relPath.startsWith("Mods/"));
    // ... process deployed files
});
```

### Query a non-default mod type

```js
const manifest = await util.getManifest(api, "mymodtype", GAME_ID);
```

---

## Notes

- `util.getManifest` is **expensive** — reads the manifest file from disk. Always cache the result within a single event handler or function call; never call it in a loop.
- The `did-deploy` event passes `deployment` as the second argument — use it directly when available to avoid the disk read.
- `IDeployedFile.source` is the mod's `installationPath` (the staging subdirectory name), not the full path.
- `target` is the per-mod output subfolder, used only when the game (or mod type) does not merge mods — empty with `mergeMods: true`. It is not the mod type id; the mod type is identified only by the manifest's file name (see On-disk location).
- Manifest is written per mod type. If you have multiple mod types, you need separate `getManifest` calls for each.

---

## See also

`VORTEX_DEPLOYMENT.md` (the deploy/purge orchestration that writes the manifest this doc reads).
`REGISTER_MERGE.md` (`baseFiles`'s `deployedFiles` argument is sourced the same way as
`getManifest`). `EVENTS.md` (`did-deploy` passes `deployment` directly, avoiding the disk read).
`NTFS_LINKS.md` (what the recorded `deploymentMethod` actually put on disk, and when a
manifest-based fallback purge replaces the method's own purge).
