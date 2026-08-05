# api.runExecutable

Launch an external process from a Vortex extension. Returns a Promise that resolves when the process exits (unless `detach: true`).

---

## Signature

```js
api.runExecutable(
  executable: string,   // absolute path to the executable
  args: string[],       // command-line arguments
  options: IRunOptions  // see below
): Promise<void>
```

---

## IRunOptions fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `cwd` | `string` | exe directory | Working directory for the process |
| `env` | `{ [key: string]: string }` | — | Additional environment variables (merged with process.env) |
| `suggestDeploy` | `boolean` | `true` | If true, Vortex prompts to deploy before running if needed |
| `shell` | `boolean` | `false` | Run through OS shell (enables pipes, env expansion) |
| `detach` | `boolean` | `false` | Also `unref()` the child so it can outlive Vortex. Does **not** resolve the promise early |
| `expectSuccess` | `boolean` | `false` | Show error notification if process exits with non-zero code |
| `onSpawned` | `(pid?: number) => void` | — | Callback immediately after process spawns; receives PID |
| `onExit` | `(code: number \| null) => void` | — | Callback when the process exits; `null` when terminated by a signal |

`onSpawned` receives no pid when Vortex doesn't know it — chiefly when the target runs elevated.

**`detach` does not make the promise resolve early.** Whatever the flag, `runExecutable` resolves
from the child's `close` event, so `await api.runExecutable(...)` waits for the process to exit.
Two separate things are going on: Vortex passes `detached: true` to `spawn` by default (only
`detach: false` turns that off), and `detach: true` additionally calls `child.unref()` so the
child can outlive Vortex. Neither changes when the promise settles. If you want to launch and
carry on, don't await it.

`onExit` (added in the 2.4.x line) is the counterpart, fired from the child process's `close`
event. It is the only way to read the actual exit code: `runExecutable`'s promise resolves with no
value, and `expectSuccess` turns a bad code into a notification rather than handing it to you.
Vortex uses it internally to pair a game launch with its exit.

Two caveats:

- **Not called on the elevated path.** When the launch is escalated, Vortex routes through
  `runElevated`, which forwards only `onSpawned`. An elevated process never fires `onExit`.
- `detach: true` only `unref()`s the child; the `close` handler stays attached, so `onExit` still
  fires while Vortex is running.

```js
await api.runExecutable(exePath, args, {
  cwd: path.dirname(exePath),
  onSpawned: (pid) => log('info', 'tool started', { pid }),
  onExit: (code) => {
    if (code !== 0) {
      log('warn', 'tool exited badly', { code });   // null => killed by signal
    }
    refreshAfterToolRun();
  },
});
```

---

## IRunParameters

Used in `registerInterpreter` and `registerStartHook` to pass or modify launch parameters through the hook chain.

```ts
interface IRunParameters {
  executable: string;
  args: string[];
  options: IRunOptions;
}
```

---

## Common patterns

### Launch a tool (no deploy prompt)

```js
api.runExecutable(toolPath, [], { suggestDeploy: false })
  .catch(err => api.showErrorNotification('Failed to run tool', err, {
    allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1,
  }));
```

### Launch with custom environment variables

```js
api.runExecutable(exePath, ['--mod-path', modPath], {
  cwd: gamePath,
  env: { GAME_ROOT: gamePath, DEBUG: '1' },
  suggestDeploy: false,
  expectSuccess: true,
});
```

### Launch detached (fire and forget)

```js
api.runExecutable(launcherPath, [], {
  detach: true,
  suggestDeploy: false,
});
// Not awaited — so execution continues here right away, and the unref'd
// launcher can outlive Vortex. The promise itself still settles on exit.
```

### Capture spawn PID

```js
let gamePid;
await api.runExecutable(exePath, [], {
  suggestDeploy: false,
  onSpawned: (pid) => { gamePid = pid; },
});
```

---

## registerStartHook — intercept and modify launch

```js
context.registerStartHook(50, 'inject-env', async (call) => {
  if (path.basename(call.executable) !== 'game.exe') return call;
  return {
    ...call,
    options: {
      ...call.options,
      env: { ...call.options.env, MOD_LOADER: '1' },
    },
  };
});
```

Hook priority: non-extension hooks use steps of 100 (50 = between built-ins). Throw `util.ProcessCanceled` or `util.UserCanceled` to cancel the launch.

---

## Notes

- Always use `suggestDeploy: false` when launching tools programmatically (not the game itself) — the deploy prompt is intended for game launches only.
- `expectSuccess: true` is useful for CLI tools where a non-zero exit indicates a real error.
- `detach: true` is needed for launching external launchers (Steam, etc.) that should outlive Vortex.
- `shell: true` is rarely needed — only when the command string requires shell interpretation (pipes, redirects). Prefer it with caution as it reduces control over the process.

---

## See also

`VORTEX_GAME_LIFECYCLE.md` (where a launch fits in the discovery-to-run flow). `REQUIRES_LAUNCHER.md`
(store-launcher redirection that runs before `api.runExecutable`). `ERROR_CLASSES.md`
(`MissingInterpreter`/`ProcessCanceled` thrown from start hooks around a launch).
`UNDERUSED_API_FUNCTIONS.md` (§4 `registerStartHook`/`registerInterpreter`).
