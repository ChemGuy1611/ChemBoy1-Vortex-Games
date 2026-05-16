# registerMerge

Registers a file-merging operation that runs during deployment. Use this when multiple mods need to contribute to a single output file (e.g., XML config, INI, database) rather than overwrite each other.

> **Warning from source:** "This API is complex — please make sure you understand how it works because trial & error might drive you mad."

---

## Signature

```js
context.registerMerge(
  test: MergeTest,   // decides if/how this merger applies
  merge: MergeFunc,  // does the actual merging for each matching file
  modType: string    // mod type the merged output is deployed as ('' = default)
)
```

---

## Types

```ts
type MergeTest = (game: IGame, gameDiscovery: IDiscoveryResult) => IMergeFilter | undefined;

type MergeFunc = (filePath: string, mergePath: string) => PromiseLike<void>;

interface IMergeFilter {
  baseFiles: (deployedFiles: IDeployedFile[]) => Array<{ in: string; out: string }>;
  filter: (fileName: string) => boolean;
}
```

---

## How it works (deployment flow)

1. `test(game, discovery)` is called — return `undefined` to skip, or an `IMergeFilter` to apply.
2. `baseFiles(deployedFiles)` returns seed file pairs:
   - `in` — absolute path of the file to start from (can be a game file, or a file from a mod; can be non-existent — you'll get an empty file)
   - `out` — relative path in the working directory (controls final output location when combined with `modType`)
3. For every installed mod file where `filter(fileName)` returns `true`, `merge(filePath, mergePath)` is called.
   - `filePath` — absolute path to the mod's version of the file
   - `mergePath` — absolute path to the working directory containing the seed file (write your merged result here)
4. The final merged file in the working directory is deployed as a regular file of the specified `modType`.

**Edge case:** If `in` was from one of the deployed mods, `merge` is called with that file again — guard against duplicating its content.

---

## Example — XML config merge (Dragon Age pattern)

```js
const ADDINS_FILE = 'AddIns.xml';

function test(game) {
  if (game.id !== GAME_ID) return undefined;

  return {
    baseFiles: () => [{
      in: addinsPath(),                         // existing game XML (or empty if missing)
      out: path.join('Settings', ADDINS_FILE),  // relative path in working dir
    }],
    filter: filePath => path.basename(filePath).toLowerCase() === 'manifest.xml',
  };
}

async function merge(filePath, mergePath) {
  const modXml = await parseXml(filePath);
  const baseXml = await parseXmlOrEmpty(path.join(mergePath, 'Settings', ADDINS_FILE));
  mergeEntries(baseXml, modXml);
  await writeXml(path.join(mergePath, 'Settings', ADDINS_FILE), baseXml);
}

context.registerMerge(test, merge, 'dazip');
```

---

## Example — INI merge (default mod type)

```js
function test(game) {
  if (game.id !== GAME_ID) return undefined;
  return {
    baseFiles: () => [{
      in: path.join(game.path, 'Engine.ini'),
      out: 'Engine.ini',
    }],
    filter: f => path.basename(f).toLowerCase() === 'engine_patch.ini',
  };
}

async function merge(filePath, mergePath) {
  const patchContent = await fs.readFileAsync(filePath, 'utf8');
  const dest = path.join(mergePath, 'Engine.ini');
  await fs.appendFileAsync(dest, '\n' + patchContent);
}

context.registerMerge(test, merge, '');  // '' = default mod type
```

---

## Notes

- `modType` determines where the merged output lands — must match a registered mod type.
- `baseFiles` receives the current `deployedFiles` array — you can use it to check which mods are deployed and conditionally return base files.
- The `out` path in `baseFiles` must be consistent — it's how Vortex finds the merged file in the working directory.
- The `merge` function is called once per matching mod file — it must handle being called multiple times on the same output file (i.e., be additive, not overwriting each call).
- Call inside `main(context)`, not in `context.once()`.
