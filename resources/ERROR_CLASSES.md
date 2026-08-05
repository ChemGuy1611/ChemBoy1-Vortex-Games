# Error Classes (util)

Throwing the correct error class changes how Vortex handles failures. Wrong class = wrong behavior (e.g., showing a crash dialog instead of silently cancelling).

---

## Full list

These ten are what to throw today. Vortex 2.5.0 begins folding them into a single `VortexError`
class — see the section further down — but they keep working and their constructors are unchanged.

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

They exist as classes inside Vortex (`src/shared/src/types/errors.ts`) but are absent from the
`util` barrel (`src/renderer/src/util/api.ts`), so `util.HTTPError` is `undefined` at runtime and
`new util.HTTPError(...)` throws. Only the ten in the table above are exported.

---

## `VortexError` (Vortex 2.5.0-beta.1+ — not in 2.4.2)

Vortex is consolidating the ten classes above onto a single error class whose identity lives in a
data field rather than in the prototype chain. **It is not in the 2.4.2 stable line**, so keep
throwing the classes above in extensions shipping today; this section is a heads-up for when 2.5.0
goes stable.

All ten classes now `extend VortexError<kind>` and carry `@deprecated Use VortexError directly`.
`instanceof UserCanceled` still works — the change is additive, and every constructor signature is
unchanged. What is new is that a caught error also exposes a discriminated `data` field:

```js
const { VortexError } = require('vortex-api');

try {
  await somethingThatMayFail();
} catch (err) {
  if (err instanceof VortexError && err.data.kind === 'fs:no-permissions') {
    // err.data is narrowed to the fs payload: { path, originalCode?, errno?, syscall? }
    api.showErrorNotification('No write access', err.data.path, { allowReport: false });
    return;
  }
  throw err;
}
```

Kind → class mapping for the ten exported classes:

| Kind | Class | Payload |
| --- | --- | --- |
| `user-canceled` | `UserCanceled` | `{ skipped: boolean }` |
| `process-canceled` | `ProcessCanceled` | `{ extraInfo?: unknown }` |
| `data-invalid` | `DataInvalid` | `{ field?: string }` |
| `setup-error` | `SetupError` | `{ component?: string }` |
| `missing-interpreter` | `MissingInterpreter` | `{ url?: string }` |
| `not-found` | `NotFound` | `{ resourceType?: string }` |
| `not-supported` | `NotSupportedError` | `{ feature?: string }` |
| `argument-invalid` | `ArgumentInvalid` | `{ argument: string }` |
| `cycle-error` | `CycleError` | `{ cycles: string[][] }` |
| `game-not-found` | `GameNotFound` | `{ gameId: string }` |

Beyond those, the kind catalog also covers filesystem (`fs:not-found`, `fs:no-permissions`,
`fs:no-space`, `fs:already-exists`, `fs:not-a-file`, `fs:not-a-directory`,
`fs:directory-not-empty`), HTTP (`http:bad-status`, `http:timeout`, `http:precondition-failed`,
`http:protocol-violation`, `http:generic`), downloads (`download:is-html`,
`download:resolver-error`), OS (`os:unsupported`, `os:generic`), and `unknown`. Subsystems add
their own via declaration merging on `VortexErrorKindMap`.

Two other fields worth knowing:

- `err.isTransient` — true only when the classifier that built the error knows the root cause is
  temporary (EMFILE, EBUSY and similar). It describes the cause, not whether your operation is
  safe to retry.
- `err.cause` — standard `Error` cause, set from the wrapped error.

Source: `Vortex/src/shared/src/errors/base.ts` (class + `VortexErrorKindMap`),
`Vortex/src/shared/src/types/errors.ts` (the compatibility subclasses).

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

---

## See also

`RUN_EXECUTABLE.md` (`MissingInterpreter`/`ProcessCanceled` thrown from `registerStartHook`/
`registerInterpreter`). `REGISTER_GAME.md` (`SetupError` thrown from `IGame.setup()`).
`INSTALLER_SYSTEM.md` (`DataInvalid` and the `error`/`unsupported` instruction types thrown from
`install`/`testSupported`). `UNDERUSED_API_FUNCTIONS.md` (§9, short pointer back to this doc).
`HEALTH_CHECK.md` (health-check results use a similar severity vocabulary, though not these
classes directly).
