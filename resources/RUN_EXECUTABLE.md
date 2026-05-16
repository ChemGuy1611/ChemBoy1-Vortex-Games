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
| `detach` | `boolean` | `false` | Detach from Vortex process tree — promise resolves immediately |
| `expectSuccess` | `boolean` | `false` | Show error notification if process exits with non-zero code |
| `onSpawned` | `(pid?: number) => void` | — | Callback immediately after process spawns; receives PID |

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
// Promise resolves immediately — process runs independently
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
