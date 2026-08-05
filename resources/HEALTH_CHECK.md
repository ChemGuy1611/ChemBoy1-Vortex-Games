# registerHealthCheck

Registers a diagnostic check that Vortex runs against the active game (or each
installed mod) and surfaces on the Health Check page. Added Vortex 2.x
(May 2026). This is the modern replacement for `registerTest` — legacy tests are
shimmed onto the same registry via `ILegacyTestAdapter`.

Use a health check when you want to detect a misconfiguration, missing
requirement, or bad mod state and (optionally) offer a one-click fix, with
control over category, severity, when it runs, and result caching.

## Source paths

- Signature: `Vortex/src/renderer/src/types/IExtensionContext.ts` (grep `registerHealthCheck`)
- Types: `Vortex/src/renderer/src/types/IHealthCheck.ts`
- Implementation: `Vortex/src/renderer/src/extensions/health_check/` (core/HealthCheckRegistry.ts, views/, reducers/)

---

## Signature

```js
context.registerHealthCheck(healthCheck: IHealthCheck | IModHealthCheck): void
```

Call in `main()`. Pass an `IHealthCheck` for a game-wide check, or an
`IModHealthCheck` for a per-mod check. The registry uses the `isModHealthCheck`
type guard (`typeof hc.checkMod === 'function'`) to tell them apart.

---

## Types

```ts
enum HealthCheckCategory {
  System = "system", Game = "game", Mods = "mods",
  Requirements = "requirements", Tools = "tools",
  Performance = "performance", Legacy = "legacy",
}

enum HealthCheckSeverity {
  Info = "info", Warning = "warning", Error = "error", Critical = "critical",
}

enum HealthCheckTrigger {
  Manual = "manual", Startup = "startup", GameChanged = "game-changed",
  ProfileChanged = "profile-changed", ModsChanged = "mods-changed",
  LoginChanged = "login-changed", SettingsChanged = "settings-changed",
  PluginsChanged = "plugins-changed", LootUpdated = "loot-updated", Scheduled = "scheduled",
}

interface IHealthCheckResult<TMetadata = unknown> {
  checkId: string;
  status: "passed" | "failed" | "warning" | "error";
  severity: HealthCheckSeverity;
  message: string;
  details?: string;
  metadata?: TMetadata;
  executionTime: number;
  timestamp: Date;
  fixAvailable?: boolean;
  isLegacyTest?: boolean;
}

type HealthCheckFunction = (api: IExtensionApi, signal?: AbortSignal) => Promise<IHealthCheckResult>;
type HealthCheckFixFunction = (api: IExtensionApi) => Promise<void>;

interface IHealthCheck {
  id: string;
  name: string;
  description: string;
  category: HealthCheckCategory;
  severity: HealthCheckSeverity;
  triggers: HealthCheckTrigger[];
  gameId?: string;           // scope to one game; omit to run for all
  dependencies?: string[];   // ids of checks that must run first
  timeout?: number;          // ms; default 30000
  cacheDuration?: number;    // ms — reuse last result within this window
  check: HealthCheckFunction;
  fix?: HealthCheckFixFunction;
  extensionName?: string;
}

// Per-mod variant. Registry iterates installed mods for the active game,
// calls checkMod per mod, aggregates results. Omits check + fix.
interface IModCheckContext {
  modId: string;
  files: string[];                              // paths relative to mod staging root
  readFile: (path: string) => Promise<Buffer>;  // resolves under mod root
  attributes: Record<string, unknown>;          // install-time attribute instructions
}

type PerModCheckFunction = (api: IExtensionApi, mod: IModCheckContext, signal?: AbortSignal)
  => Promise<IHealthCheckResult>;

interface IModHealthCheck extends Omit<IHealthCheck, "check" | "fix"> {
  checkMod: PerModCheckFunction;
}

// Legacy registerTest shimmed onto the registry:
interface ILegacyTestAdapter extends IHealthCheck {
  eventType: string;
  originalCheck: CheckFunction;
  isLegacyTest: true;
}

function isModHealthCheck(hc): hc is IModHealthCheck; // typeof hc.checkMod === 'function'
```

---

## How it works

1. Extension registers a check in `main()`.
2. The registry runs `check` (or `checkMod` per installed mod) when any of the
   declared `triggers` fire — e.g. on startup, game switch, mods changed, or
   manual run from the Health Check page.
3. If `cacheDuration` is set, the last result is reused within that window
   instead of re-running.
4. The returned `IHealthCheckResult` drives the UI: `status` + `severity` set
   the icon/colour, `message`/`details` the text, and `fixAvailable` (with a
   `fix` functor present) shows a fix button. Invoking it calls `fix(api)`.

`fix` is only available on game-wide `IHealthCheck` — `HealthCheckFixFunction`
takes only `(api)` and can't target a single mod, so `IModHealthCheck` omits it.

---

## Timeout and the abort signal

`check` and `checkMod` receive an `AbortSignal` as their last parameter. The registry starts an
`AbortController` per run and aborts it after `timeout` ms (**default 30000**), racing the abort
against your promise.

**The abort is cooperative — you must poll it.** The registry cannot stop a function body that
ignores the signal. When the timeout fires, the user sees a "Health check timed out" notification
and the previous result is cleared, but your body keeps running and holds the check's concurrency
slot until it finally returns. Any check that loops over mods or files, or makes network calls,
should bail out early:

```js
check: async (api, signal) => {
  const start = Date.now();
  for (const file of manyFiles) {
    if (signal?.aborted) {
      throw new util.ProcessCanceled('health check aborted');
    }
    await inspect(file);
  }
  return { /* ... */ };
},
```

Pass `signal` straight through to anything that accepts one (`fetch`, `AbortSignal`-aware helpers)
rather than polling manually where you can.

## Scoping a check to one game

`gameId` on `IHealthCheck` / `IModHealthCheck` restricts the check to a single game. With it set,
the registry skips the check while any other game is active, and discards a result that arrives
after the user has switched away — so a check that started under your game can never report against
someone else's. Omit `gameId` for a check that should run regardless of active game.

This is the cleaner alternative to an early `return { status: 'passed' }` when the active game
isn't yours: the check simply doesn't run, and no stale result lingers on the page.

---

## Game-wide check with fix

```js
const { HealthCheckCategory, HealthCheckSeverity, HealthCheckTrigger } =
  require('vortex-api').types; // enums exported via types namespace; verify import path

context.registerHealthCheck({
  id: `${GAME_ID}-required-tool`,
  name: 'Script extender installed',
  description: 'Checks the script extender is present in the game folder.',
  category: HealthCheckCategory.Requirements,
  severity: HealthCheckSeverity.Warning,
  triggers: [HealthCheckTrigger.GameChanged, HealthCheckTrigger.Manual],
  cacheDuration: 60000,
  check: async (api) => {
    const start = Date.now();
    const present = await isExtenderInstalled(api);
    return {
      checkId: `${GAME_ID}-required-tool`,
      status: present ? 'passed' : 'failed',
      severity: HealthCheckSeverity.Warning,
      message: present ? 'Script extender found.' : 'Script extender missing.',
      executionTime: Date.now() - start,
      timestamp: new Date(),
      fixAvailable: !present,
    };
  },
  fix: async (api) => { await downloadExtender(api); },
});
```

---

## Per-mod check

```js
context.registerHealthCheck({
  id: `${GAME_ID}-loose-files`,
  name: 'No loose script files',
  description: 'Flags mods shipping raw scripts outside the expected folder.',
  category: HealthCheckCategory.Mods,
  severity: HealthCheckSeverity.Info,
  triggers: [HealthCheckTrigger.ModsChanged],
  checkMod: async (api, mod) => {
    const start = Date.now();
    const bad = mod.files.some(f => f.endsWith('.lua') && !f.includes('Scripts/'));
    return {
      checkId: `${GAME_ID}-loose-files`,
      status: bad ? 'warning' : 'passed',
      severity: HealthCheckSeverity.Info,
      message: bad ? `${mod.modId} has loose scripts.` : 'OK',
      executionTime: Date.now() - start,
      timestamp: new Date(),
    };
  },
});
```

---

## Migrating from registerTest

`registerTest(id, event, check)` still works — Vortex wraps it as an
`ILegacyTestAdapter` (category `Legacy`, `isLegacyTest: true`) on the health-check
registry. Prefer `registerHealthCheck` for new code: it adds category/severity,
declarative triggers, caching, per-mod checks, and one-click fixes that
`registerTest` lacks.

---

## See also

`VORTEX_GAME_LIFECYCLE.md` (`GameChanged`/`Startup` triggers fire from this runtime flow).
`VORTEX_APP.md` (overview of where Health Check fits among other extension systems).
`ERROR_CLASSES.md` (throwing from inside a `check`/`checkMod`/`fix` function still uses these
classes). `UNDERUSED_API_FUNCTIONS.md` (§11 short pointer back to this doc).
