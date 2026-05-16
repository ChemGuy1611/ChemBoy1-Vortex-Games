# Deployment Manifest

The deployment manifest records what files have been deployed to a game's mod folder. It is written and read by Vortex's deployment system and can be queried by extensions after deployment.

---

## IDeployedFile (line 2424)

```ts
interface IDeployedFile {
  relPath: string;    // path relative to game mod folder
  source: string;     // mod staging folder name that owns this file
  merged?: string[];  // other sources merged into this file
  target?: string;    // mod type id (empty = default)
  time: number;       // deploy timestamp (ms)
}
```

---

## IDeploymentManifest (line 2452)

```ts
interface IDeploymentManifest {
  version: string;
  instance: string;
  deploymentMethod?: string;  // activator id (e.g. 'hardlink_activator')
  deploymentTime?: number;    // ms timestamp
  stagingPath?: string;       // absolute staging directory
  gameId?: string;
  targetPath?: string;        // absolute mod folder path
  files: IDeployedFile[];
}
```

---

## Reading the manifest

```js
// Expensive — always cache the result within a single handler
const manifest = await util.getManifest(api, modType?, gameId?);
```

| Arg | Default | Description |
| --- | --- | --- |
| `api` | required | IExtensionApi |
| `modType` | `''` (default type) | Mod type id to query |
| `gameId` | active game | Game to query |

---

## Common patterns

### Check if a specific file is deployed

```js
const manifest = await util.getManifest(api);
const isDeployed = manifest.files.some(
  f => f.relPath.toLowerCase() === 'mods/mymod.pak'
);
```

### Find all files from a specific mod

```js
const manifest = await util.getManifest(api);
const modFiles = manifest.files.filter(f => f.source === mod.installationPath);
```

### Post-deploy processing (did-deploy event)

```js
api.onAsync('did-deploy', async (profileId, deployment) => {
  // deployment may be passed directly — use it if provided to avoid a second fetch
  const manifest = deployment ?? await util.getManifest(api);
  const relevant = manifest.files.filter(f => f.relPath.startsWith('Mods/'));
  // ... process deployed files
});
```

### Query a non-default mod type

```js
const manifest = await util.getManifest(api, 'mymodtype', GAME_ID);
```

---

## Notes

- `util.getManifest` is **expensive** — reads the manifest file from disk. Always cache the result within a single event handler or function call; never call it in a loop.
- The `did-deploy` event passes `deployment` as the second argument — use it directly when available to avoid the disk read.
- `IDeployedFile.source` is the mod's `installationPath` (the staging subdirectory name), not the full path.
- `target` is the mod type id — empty string means the default mod type.
- Manifest is written per mod type. If you have multiple mod types, you need separate `getManifest` calls for each.
