# registerMigration

Registers a function that runs when the extension version changes. Use it to migrate stored state, purge stale files, or prompt the user about breaking changes.

---

## Signature

```js
context.registerMigration(
  migrate: (oldVersion: string) => Promise<void>
)
```

---

## Key facts

| Fact | Detail |
| --- | --- |
| **When it runs** | When the stored extension version differs from the current `info.json` version |
| **Process** | Main process — NOT the renderer. `api.store` is not available. Use `context.api.store.getState()` only after `context.api.awaitUI()` if you need state. |
| **`oldVersion`** | Previous stored version. `"0.0.0"` if first run or state was damaged. |
| **Multiple registrations** | Each `registerMigration` call registers independently. All run if versions differ. Each gate its own version range. |
| **Version update** | Stored version is updated to current **after** the promise resolves. |

---

## Standard pattern

Always version-gate with a semver check — skip if the stored version is already past the target.

```js
const semver = require('semver');

async function migrate100(api, oldVersion) {
  if (semver.gte(oldVersion, '1.0.0')) return;
  // ... migration logic for < 1.0.0 to 1.0.0
}

async function migrate200(api, oldVersion) {
  if (semver.gte(oldVersion, '2.0.0')) return;
  // ... migration logic for < 2.0.0 to 2.0.0
}

// In main(context):
context.registerMigration(old => migrate100(context.api, old));
context.registerMigration(old => migrate200(context.api, old));
```

---

## First-run detection

`oldVersion === '0.0.0'` means first install (or state damage). Use this to set up initial state rather than migrating from an old format.

```js
async function migrateFirstRun(api, oldVersion) {
  if (oldVersion !== '0.0.0') return;
  // First install — create initial config
  await fs.ensureDirWritableAsync(CONFIG_DIR);
}
```

---

## Purging stale files on breaking change

```js
async function migrate110(api, oldVersion) {
  if (semver.gte(oldVersion, '1.1.0')) return;

  // Old versions wrote cache files to the wrong location
  const stalePath = path.join(OLD_CACHE_DIR, 'cache.json');
  await fs.removeAsync(stalePath).catch(() => null);
}
```

---

## Notifying the user

```js
async function migrate200(api, oldVersion) {
  if (semver.gte(oldVersion, '2.0.0')) return;

  await api.awaitUI();  // wait for renderer to be ready before showing dialogs
  await api.showDialog('info', 'Extension Updated', {
    text: 'The mod layout has changed. Your mods will need to be redeployed.',
  }, [{ label: 'OK' }]);

  api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
}
```

---

## State access in migration

Migration runs in the main process. You can read state but UI is not guaranteed ready:

```js
async function migrate100(api, oldVersion) {
  if (semver.gte(oldVersion, '1.0.0')) return;

  // Safe: read state directly
  const state = api.store.getState();
  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if (!discovery?.path) return;

  // Need UI (dialogs, notifications): await first
  await api.awaitUI();
  api.sendNotification({ type: 'info', message: 'Migration complete', displayMS: 3000 });
}
```

---

## Notes

- Call inside `main(context)`, not `context.once()`.
- Multiple `registerMigration` calls are all executed when migration is triggered — each must gate itself independently.
- Never rely on migrations running in a specific order relative to each other if you register multiple.
- `oldVersion = "0.0.0"` is also set when the extension state was corrupted — handle it defensively.
- The extension version in `info.json` (`"version"`) is what Vortex compares against the stored value.
