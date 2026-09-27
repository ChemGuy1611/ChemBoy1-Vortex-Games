# Error Classes (VortexError)

Throwing the correct error kind changes how Vortex handles failures. Wrong kind = wrong behavior (e.g., showing a crash dialog instead of silently cancelling).

Since **v2.5.0** (2026-08-10) Vortex identifies errors by a single `VortexError` class whose identity lives in a `data.kind` field rather than in the prototype chain. The ten older `util.<Class>` error classes still exist, but every one of them is marked `@deprecated Use VortexError directly`. Every extension in this repo now throws `VortexError` directly and branches on `data.kind` — there are no `util.<Class>` constructors or `instanceof util.<Class>` checks left.

`VortexError` is a **top-level** `vortex-api` export, not part of `util`:

```js
const { util, VortexError } = require("vortex-api");
```

---

## Kinds to throw

| Kind                  | Construct                                                                        | Vortex behavior when thrown                                   | Deprecated class it replaces |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------- |
| `user-canceled`       | `new VortexError("User canceled", { kind: "user-canceled", skipped: false })`   | Silently aborts; no error shown. User chose to cancel.        | `util.UserCanceled`          |
| `process-canceled`    | `new VortexError("reason", { kind: "process-canceled" })`                        | Silently aborts with optional log message. Code cancelled it. | `util.ProcessCanceled`       |
| `data-invalid`        | `new VortexError("bad data", { kind: "data-invalid" })`                          | Shows error notification. Input data is malformed.            | `util.DataInvalid`           |
| `setup-error`         | `new VortexError("missing file", { kind: "setup-error", component })`            | Shows setup/config error. User action required to fix.        | `util.SetupError`            |
| `missing-interpreter` | `new VortexError("msg", { kind: "missing-interpreter", url })`                   | Shows "install interpreter" prompt; url opens download page.  | `util.MissingInterpreter`    |
| `not-found`           | `new VortexError("config.ini", { kind: "not-found" })`                           | Shows not-found error. Expected resource absent.              | `util.NotFound`              |
| `not-supported`       | `new VortexError("Not supported", { kind: "not-supported" })`                    | Shows "not supported" error.                                  | `util.NotSupportedError`     |
| `argument-invalid`    | `new VortexError("Invalid argument", { kind: "argument-invalid", argument })`    | Shows internal argument error. For programming errors.        | `util.ArgumentInvalid`       |
| `cycle-error`         | `new VortexError("Circular dependency", { kind: "cycle-error", cycles })`        | Circular dependency detected.                                 | `util.CycleError`            |
| `game-not-found`      | `new VortexError("Game not found", { kind: "game-not-found", gameId })`          | Game lookup failed in `GameStoreHelper`.                      | `util.GameNotFound`          |

The first argument is always a human-readable, display-ready message. Unlike the old classes, every kind takes one — including `user-canceled`, whose old class only took a `skipped` boolean. (Passing a message string to `util.UserCanceled(...)` was a common mistake: the string landed in the boolean `skipped` slot and the text was lost.)

Payloads per kind:

| Kind                  | Payload                     |
| --------------------- | --------------------------- |
| `user-canceled`       | `{ skipped: boolean }`      |
| `process-canceled`    | `{ extraInfo?: unknown }`   |
| `data-invalid`        | `{ field?: string }`        |
| `setup-error`         | `{ component?: string }`    |
| `missing-interpreter` | `{ url?: string }`          |
| `not-found`           | `{ resourceType?: string }` |
| `not-supported`       | `{ feature?: string }`      |
| `argument-invalid`    | `{ argument: string }`      |
| `cycle-error`         | `{ cycles: string[][] }`    |
| `game-not-found`      | `{ gameId: string }`        |

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
`Vortex/src/shared/src/types/errors.ts` (the deprecated compatibility subclasses).

---

## Catching: branch on `data.kind`, never `instanceof` a subclass

All ten deprecated classes `extend VortexError`, so an instance of the old class still carries the matching `data.kind`. The compatibility only runs one way, though: an error built with `new VortexError(msg, { kind: "user-canceled", skipped: false })` is **not** `instanceof UserCanceled`. The subclasses define no `Symbol.hasInstance`, so a plain `VortexError` fails every subclass check. Vortex only rebuilds the subclass when an error crosses an IPC boundary (main ↔ renderer); a throw and a catch inside the same extension never pass through that.

So test the kind, not the class. The kind check matches both shapes — old subclass instances that Vortex core may still throw, and plain `VortexError`s:

```js
try {
    await downloadRequirement(api, req);
} catch (err) {
    if (err?.data?.kind === "process-canceled") {
        log("warn", `Skipped requirement ${req.userFacingName}`, err.message);
    } else {
        api.showErrorNotification(`Failed to install ${req.userFacingName}`, err, { allowReport: false });
    }
}
```

When the error might not be a `VortexError` at all and you need the narrowed payload type, combine the two:

```js
if (err instanceof VortexError && err.data.kind === "fs:no-permissions") {
    // err.data is narrowed to the fs payload: { path, originalCode?, errno?, syscall? }
    api.showErrorNotification("No write access", err.data.path, { allowReport: false });
}
```

When migrating older code, convert the catches **before or together with** the throws. Converting a throw to `VortexError` while a same-extension catch still tests `err instanceof util.ProcessCanceled` silently changes that branch — a quiet "skip" becomes a visible error.

---

## NOT exported (do not use)

These names do **not** exist in the API:

- `util.MissingDependency` — not exported
- `util.HTTPError` — not exported
- `util.TemporaryError` — not exported

They exist as classes inside Vortex (`src/shared/src/types/errors.ts`) but are absent from the
`util` barrel (`src/renderer/src/util/api.ts`), so `util.HTTPError` is `undefined` at runtime and
`new util.HTTPError(...)` throws. For an HTTP failure, throw `VortexError` with an `http:*` kind instead.

---

## Cancel semantics

### user-canceled vs process-canceled

```js
// User clicked Cancel in a dialog
throw new VortexError("User canceled", { kind: "user-canceled", skipped: false });

// Code determined the operation cannot proceed (not a user action)
throw new VortexError("Game not in active mode", { kind: "process-canceled" });
```

Both are silent — no crash dialog or error notification. The difference is semantic (who caused it) and may affect logging. Verified live on Vortex 2.8.0-beta.1: an installer that rejects with a plain `VortexError` of kind `user-canceled` finishes with install outcome `canceled`, exactly as `util.UserCanceled` did.

### registerStartHook — cancel a game launch

```js
context.registerStartHook(50, "my-hook", async (call) => {
    const ready = await checkPrerequisites();
    if (!ready) throw new VortexError("Prerequisites not met", { kind: "process-canceled" });
    return call;
});
```

Throwing a `process-canceled` or `user-canceled` error inside a start hook prevents the game from launching.

---

## Installation errors

```js
// Inside an install function:

// Non-fatal: mark specific files as unsupported
instructions.push({ type: "unsupported", source: filePath });

// Fatal: abort the entire installation
instructions.push({ type: "error", value: "Cannot install: missing required file" });

// Alternative: throw to abort immediately
throw new VortexError("Archive contains no valid mod files", { kind: "data-invalid" });
```

---

## Setup errors

```js
// In IGame.setup() — shown to user as a config problem
async function setup(discovery) {
    const execPath = path.join(discovery.path, "modmanager.exe");
    if (!(await fs.statSilentAsync(execPath).catch(() => false))) {
        throw new VortexError("ModManager not found. Install it first.", {
            kind: "setup-error",
            component: "ModManager",
        });
    }
}
```

---

## Notes

- **Never throw a raw `Error`** in installer or hook code — it shows a crash dialog. Throw a `VortexError` with the right kind.
- `user-canceled` and `process-canceled` both suppress error UI. Use `user-canceled` when the user explicitly clicked cancel; use `process-canceled` for programmatic aborts.
- `missing-interpreter` takes an optional `url` in its payload — always provide it so users know where to download the missing tool.
- `VortexError` needs a Vortex **v2.5.0+** bundle. On an older bundle the import is `undefined` and `new VortexError(...)` throws a `TypeError`.

---

## See also

`RUN_EXECUTABLE.md` (`missing-interpreter`/`process-canceled` thrown from `registerStartHook`/
`registerInterpreter`). `REGISTER_GAME.md` (`setup-error` thrown from `IGame.setup()`).
`INSTALLER_SYSTEM.md` (`data-invalid` and the `error`/`unsupported` instruction types thrown from
`install`/`testSupported`). `UNDERUSED_API_FUNCTIONS.md` (§9, short pointer back to this doc).
`HEALTH_CHECK.md` (health-check results use a similar severity vocabulary, though not these
kinds directly). `STEAM_FILE_DOWNLOADER.md` (`process-canceled` for invalid Steam credentials,
`user-canceled` from the login/Steam Guard dialogs). `DOWNLOADER.md` (the requirement loop's
`process-canceled` skip). `DEPRECATED_METHODS.md` (index of every deprecated symbol across the
published API, this family included).
