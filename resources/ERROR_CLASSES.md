# Error Classes (util)

Throwing the correct error class changes how Vortex handles failures. Wrong class = wrong behavior (e.g., showing a crash dialog instead of silently cancelling).

---

## Full list

| Class | Constructor | Vortex behavior when thrown |
| --- | --- | --- |
| `util.UserCanceled(skipped?)` | `new util.UserCanceled()` | Silently aborts; no error shown. User chose to cancel. |
| `util.ProcessCanceled(message, extraInfo?)` | `new util.ProcessCanceled('reason')` | Silently aborts with optional log message. Code cancelled it. |
| `util.DataInvalid(message)` | `new util.DataInvalid('bad data')` | Shows error notification. Input data is malformed. |
| `util.SetupError(message, component?)` | `new util.SetupError('missing file')` | Shows setup/config error. User action required to fix. |
| `util.MissingInterpreter(message, url?)` | `new util.MissingInterpreter('msg', url)` | Shows "install interpreter" prompt; url opens download page. |
| `util.NotFound(what)` | `new util.NotFound('config.ini')` | Shows not-found error. Expected resource absent. |
| `util.NotSupportedError()` | `new util.NotSupportedError()` | Shows "not supported" error. |
| `util.ArgumentInvalid(argument)` | `new util.ArgumentInvalid('gameId')` | Shows internal argument error. For programming errors. |
| `util.CycleError` | `new util.CycleError()` | Circular dependency detected. |
| `util.GameNotFound` | `new util.GameNotFound()` | Game lookup failed in `GameStoreHelper`. |

---

## NOT exported (do not use)

These names do **not** exist in the API:

- `util.MissingDependency` — not exported
- `util.HTTPError` — not exported
- `util.TemporaryError` — not exported

---

## Cancel semantics

### UserCanceled vs ProcessCanceled

```js
// User clicked Cancel in a dialog
throw new util.UserCanceled();

// Code determined the operation cannot proceed (not a user action)
throw new util.ProcessCanceled('Game not in active mode');
```

Both are silent — no crash dialog or error notification. The difference is semantic (who caused it) and may affect logging.

### registerStartHook — cancel a game launch

```js
context.registerStartHook(50, 'my-hook', async (call) => {
  const ready = await checkPrerequisites();
  if (!ready) throw new util.ProcessCanceled('Prerequisites not met');
  return call;
});
```

Throwing `ProcessCanceled` or `UserCanceled` inside a start hook prevents the game from launching.

---

## Installation errors

```js
// Inside an install function:

// Non-fatal: mark specific files as unsupported
instructions.push({ type: 'unsupported', source: filePath });

// Fatal: abort the entire installation
instructions.push({ type: 'error', value: 'Cannot install: missing required file' });

// Alternative: throw to abort immediately
throw new util.DataInvalid('Archive contains no valid mod files');
```

---

## Setup errors

```js
// In IGame.setup() — shown to user as a config problem
async function setup(discovery) {
  const execPath = path.join(discovery.path, 'modmanager.exe');
  if (!await fs.statSilentAsync(execPath).catch(() => false)) {
    throw new util.SetupError(
      'ModManager not found. Install it first.',
      'ModManager'
    );
  }
}
```

---

## Notes

- **Never throw a raw `Error`** in installer or hook code — it shows a crash dialog. Use the semantic classes above.
- `UserCanceled` and `ProcessCanceled` both suppress error UI. Use `UserCanceled` when the user explicitly clicked cancel; use `ProcessCanceled` for programmatic aborts.
- `MissingInterpreter` takes an optional `url` param — always provide it so users know where to download the missing tool.
