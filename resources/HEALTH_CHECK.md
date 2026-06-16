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
  ResultsChanged = "health-check-results-changed", SettingsChanged = "settings-changed",
  PluginsChanged = "plugins-changed", LootUpdated = "loot-updated", Scheduled = "scheduled",
}

interface IHealthCheckResult {
  checkId: string;
  status: "passed" | "failed" | "warning" | "error";
  severity: HealthCheckSeverity;
  message: string;
  details?: string;
  metadata?: { [key: string]: any };
  executionTime: number;
  timestamp: Date;
  fixAvailable?: boolean;
  isLegacyTest?: boolean;
}

type HealthCheckFunction = (api: IExtensionApi) => Promise<IHealthCheckResult>;
type HealthCheckFixFunction = (api: IExtensionApi) => Promise<void>;

interface IHealthCheck {
  id: string;
  name: string;
  description: string;
  category: HealthCheckCategory;
  severity: HealthCheckSeverity;
  triggers: HealthCheckTrigger[];
  dependencies?: string[];   // ids of checks that must run first
  timeout?: number;          // ms
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

type PerModCheckFunction = (api: IExtensionApi, mod: IModCheckContext) => Promise<IHealthCheckResult>;

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
