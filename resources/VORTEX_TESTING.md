# Testing Vortex

How the `Nexus-Mods/Vortex` app repo is tested, what a pull request is expected to ship, and how to
write and run both test layers — vitest for units and integration, Playwright for end-to-end against
the real Electron app. The build/lint/typecheck side of verifying a change is in
`VORTEX_DEV_BUILD.md`; the conventions the test code itself is written to are in
`VORTEX_CODESTYLE.md`.

Commands below are given in the unambiguous `pnpm -F <package> ...` form. Everything was checked
against a `master` clone; script and target names move, so read `package.json` and
`packages/e2e/package.json` if a command is rejected.

---

## The two layers

| Layer | Runner | Lives in | Run with | Blocks a normal PR |
| --- | --- | --- | --- | --- |
| Unit | vitest | colocated `src/**/*.test.ts(x)` | `pnpm run test` | Yes |
| Integration | vitest | `src/main/**/*.test.integration.ts` | `pnpm run test` | Yes |
| End-to-end | Playwright + Electron | `packages/e2e/src/tests/*.spec.ts` | `pnpm run e2e` | No |

`pnpm run test` expands to `pnpm nx run-many -t test test:integration --exclude @vortex/e2e`, so the
first two layers run together and the E2E package is deliberately excluded from it.

The repo's own written rules are split the same way: `AGENTS-TESTING.md` covers only the vitest
half, and every Playwright rule lives in `packages/e2e/E2E-BEST-PRACTICES.md` plus the packaged
`e2e-test` skill under `.claude/skills/`. Reading `AGENTS-TESTING.md` alone leaves the E2E
conventions unknown.

---

## What a pull request has to ship

Every behaviour change gets a test at the lowest layer that can observe it — a pure function or a
reducer is a unit test, a rendered control is a renderer test, a flow that only exists once the app
is running is an E2E spec. A bug fix gets a test that fails without the fix.

Run them before the PR goes up, and record in the PR which ones ran:

```powershell
pnpm run test
pnpm nx run <affected-project>:lint
pnpm nx run <affected-project>:typecheck
pnpm run e2e          # when the change touches a UI flow
```

`AGENTS.md` asks for `build`, `test`, `lint`, and `format` on the affected package after any code
change; the list above is that, with the E2E layer added for UI work.

The E2E layer has to be run locally because CI will not run it for you — see "What CI actually
runs" below. A change that alters what the user sees or clicks is only verified if you ran
`pnpm run e2e` (or at least the affected spec) yourself.

---

## Layer 1 — vitest

### Placement and registration

Tests are colocated with the code they cover: `Foo.ts` next to `Foo.test.ts`, `Bar.tsx` next to
`Bar.test.tsx`. Integration tests are `*.test.integration.ts` and currently exist only under
`src/main`.

Each project owns a `vitest.config.ts`, and the root `vitest.config.ts` picks them up through globs:

```ts
projects: [
  "./src/**/vitest.config.ts",
  "./src/**/vitest.config.mts",
  "./src/main/vitest.downloader.config.ts",
  "./packages/**/vitest.config.ts",
  "./extensions/**/vitest.config.ts",
  "./scripts/vitest.config.ts",
  "./.github/actions/*/vitest.config.ts",
]
```

A new package or extension needs its own `vitest.config.ts` at a path one of those globs matches, or
its tests silently never run in the repo-wide command.

| Project | Environment | Notes |
| --- | --- | --- |
| `@vortex/main` | `node` | `src/**/*.test.ts` plus root-level `*.test.ts` |
| `@vortex/main` (integration) | `node` | `src/**/*.test.integration.ts`, 30 s per-test timeout |
| `@vortex/renderer` | `happy-dom` | `@vitejs/plugin-react`, `globals: true`, `setupFiles: ["./test-setup.ts"]` |
| `@vortex/shared` | `node` | plain vitest |

The renderer's `test-setup.ts` registers `@testing-library/jest-dom/vitest` matchers and stubs the
`VortexPaths` object so `getVortexPath`-backed selectors resolve real strings instead of throwing.
Globals are enabled only so `@testing-library/react` can self-register its act environment and auto
cleanup — test files should still import `describe`/`it`/`expect` from `vitest` explicitly.

### Running a subset

```powershell
pnpm run test -- <path>                                    # documented repo-wide shortcut
pnpm nx run @vortex/renderer:test                          # one project
pnpm -F @vortex/renderer exec vitest run src/controls/ContextMenu.test.tsx
pnpm -F @vortex/renderer exec vitest                       # watch mode
```

`test` targets are not nx-cached, so a rerun always executes.

### Finding elements in component tests

Target a `data-testid`, or a role when exactly one element carries it. Add the attribute to the
component — `Button`, `Input` and the other UI primitives spread unknown props onto the underlying
element, and `IToolbarAction` takes a `testId`.

Do not look elements up by their text. There is no i18n instance in the test setup, so `t` returns
the translation key it was handed; a key can be shared by several elements and says nothing about
what the user sees. Text matching belongs in the E2E suite, which runs against real translations.

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContextMenu from "./ContextMenu";

describe("ContextMenu", () => {
  it("opens on right click", () => {
    render(<Harness />);
    fireEvent.contextMenu(screen.getByTestId("row"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
```

### Extensions that import `vortex-api`

An extension test that imports `vortex-api` needs a local alias to a hand-written mock, and the mock
should export only what the test actually uses:

```ts
// vitest.config.ts
import * as path from "node:path";

resolve: {
  alias: {
    "vortex-api": path.resolve(import.meta.dirname, "__mocks__/vortex-api.ts"),
  },
}
```

```ts
// __mocks__/vortex-api.ts
import { vi } from "vitest";

export const fs = {};
export const util = {};
export const log = vi.fn();
```

`packages/extension-test-mocks` holds shared mocks, and `packages/game-extension-test` is a separate
CLI harness that loads a bundled game extension and runs fixture installs against it.

---

## Layer 2 — Playwright against Electron

`packages/e2e` drives the real renderer through Playwright's `_electron` API. This is a desktop app,
not a web page: there is no URL bar, no multi-browser project matrix, and no remote staging
environment.

Each test gets its own Electron process and its own temp user-data directory. Isolation comes from
`ELECTRON_USERDATA` and `ELECTRON_APPDATA` pointing at subdirectories of that temp dir, plus
`VORTEX_E2E=1`, which drops the single-instance lock so parallel instances can run. Nothing leaks
between tests — not login state, not the Redux store, not on-disk data — regardless of worker count.

### One-time setup

```powershell
pnpm -F @vortex/e2e exec playwright install chromium
```

Credentials go in `packages/e2e/.env` (gitignored); `playwright.config.ts` loads that file at
startup:

```env
E2E_NEXUS_FREE_USER_USERNAME=NXMMember
E2E_NEXUS_FREE_USER_PASSWORD=...
E2E_NEXUS_PREMIUM_USER_USERNAME=NXMPremium
E2E_NEXUS_PREMIUM_USER_PASSWORD=...
```

Login currently requires a VPN connection to the Nexus office network. Specs that do not set a user
run against a fresh, logged-out app and need no credentials at all — start there when you have no
access.

`pnpm -F @vortex/e2e run auth:capture` records a local Nexus browser session. When that file exists,
the auth snapshot build lands on the OAuth consent screen and skips the captcha-gated credential
form; without it the full credential flow runs, which is what CI does.

### Running the suite

| Command | Effect |
| --- | --- |
| `pnpm run e2e` | Whole suite, headless (`pnpm nx run @vortex/e2e:e2e`) |
| `pnpm -F @vortex/e2e run e2e:headed` | Same, with a visible window (`VORTEX_E2E_HEADED=1`) |
| `pnpm -F @vortex/e2e run e2e:ui` | Playwright UI mode, headed |
| `pnpm -F @vortex/e2e exec playwright test mods.spec.ts` | One spec file |
| `pnpm -F @vortex/e2e exec playwright test -g "Settings"` | By test name |
| `pnpm -F @vortex/e2e exec playwright test --grep "@smoke"` | By tag |
| `pnpm -F @vortex/e2e exec playwright show-report` | Open the HTML report from the last run |
| `pnpm -F @vortex/e2e exec playwright show-trace <zip>` | Open an attached trace |
| `pnpm -F @vortex/e2e run dev` | Inspector run: `VORTEX_E2E_INSPECT=1`, `--workers=1` |
| `pnpm -F @vortex/e2e run dev:explore` | Launch one isolated instance, no test |

Every E2E target declares `dependsOn: @vortex/main:build`, so the first invocation builds the app
before Playwright starts — budget several minutes for it.

The config sets `retries: 1`, turns `screenshot`, `video` and `trace` all `"off"`, and reports
through `list` + `html` (`packages/e2e/playwright-report`) + `junit`, adding the `github` reporter
under CI. Diagnostics are attached by the fixtures themselves rather than by Playwright's capture
options.

Two published commands do not resolve: the root `e2e:debug` and `e2e:report` scripts call nx targets
that `packages/e2e/package.json` does not define. The real script names are the ones in the table.

### Fixtures

Specs import `test` and `expect` from `../fixtures/vortex-app`, never from `@playwright/test`:

```ts
import { test, expect } from "../fixtures/vortex-app";
import { DashboardPage } from "../selectors/dashboard";

test("customise button works", async ({ vortexWindow }) => {
  const dashboard = new DashboardPage(vortexWindow);
  await expect(dashboard.customiseButton).toBeVisible();
  await dashboard.customiseButton.click();
  await expect(dashboard.doneButton).toBeVisible();
});
```

| Fixture | Scope | What it gives |
| --- | --- | --- |
| `vortexWindow` | test | The main renderer `Page`, past the splash screen — use this for almost everything |
| `vortexApp` | test | The `ElectronApplication` handle; only for IPC, extra windows, or `app.evaluate` |
| `vortexUserDataDir` | test | Path to this test's isolated temp user-data directory |
| `managedGame` | test | A fake Stardew Valley install, already managed; cleaned up afterwards |
| `nexusUser` | option | `freeUser` or `premiumUser`; defaults to `null` (no login) |
| `nexusPage` | test | A logged-in Chromium page on nexusmods.com; the test auto-skips without `nexusUser` |
| `workerAuthSnapshots` | worker | Cached per-role auth snapshots for the worker's lifetime |

Set the user role with `test.use()` at describe level, never inside a `test()` body:

```ts
import { test, expect } from "../fixtures/vortex-app";
import { freeUser } from "../helpers/users";

test.describe("premium features", () => {
  test.use({ nexusUser: freeUser });

  test("download a mod", async ({ vortexWindow, managedGame }) => {
    // logged in as freeUser, stardewvalley already managed
  });
});
```

Role and game are independent axes — request both fixtures to get both.

The first test on a worker that needs a given role triggers one snapshot build: a throwaway Electron
instance authenticates through OAuth, then closes cleanly so the DuckDB write-ahead log is flushed
and the state file is consistent on disk. That directory is cached for the worker's lifetime and
copied fresh into each test's user-data dir, so no test repeats the OAuth flow. Two tests on the
same worker needing the same role share a single in-flight build promise.

For a test that only needs the game's files to exist on disk, without Vortex managing it, call
`setupFakeGame` / `cleanupFakeGame` from `../fixtures/game-setup/fake-game` directly. Configs
available today are `stardewvalley` and `skyrimse`; only `stardewvalley` works through the
`managedGame` fixture, because Skyrim SE goes through the manual-discovery dialog that the fake
install is not yet rich enough to satisfy.

### Page object models

Selectors live in `packages/e2e/src/selectors/`, one file per area (`dashboard.ts`, `navbar.ts`,
`settings.ts`, `modsPage.ts`, ...), classes named after the page. No `_pom` suffix — that is a
different repo's convention.

```ts
import type { Locator, Page } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly customiseButton: Locator;
  readonly doneButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customiseButton = page.getByText(/customi[sz]e/i).first();
    this.doneButton = page.getByText(/done/i).first();
  }
}
```

Instantiate a POM when the step needs it, not all at the top of the test, and instantiate a fresh
one after navigating rather than reusing a stale instance.

### Helpers

`packages/e2e/src/helpers/` holds the cross-spec logic: `navigation`, `login`, `users`, `games`,
`mods`, `modDownload`, `notifications`, `dialogs`, `healthCheck`, `consent`, `imageStub`,
`nxmCapture`, `protocolClient`, `externalOpen`, `nexusBrowser`, `authState`, `diagnostics`,
`timeouts`, `inspect`. Check it before writing a flow — a login sequence, a download, a multi-step
navigation, or forwarding an `nxm://` URL to Vortex already exists.

Helpers orchestrate POMs and fixtures; they do not hold their own selectors. When you catch yourself
about to copy a block out of another spec, extract it into a helper instead, call it from both
places, and update the spec you copied from.

### Structuring a spec

Decompose with `test.step()`, and give every action an assertion so a failure points at the step
that broke:

```ts
await test.step("Navigate to the games page", async () => {
  const navbar = new NavBar(vortexWindow);
  await expect(navbar.gamesLink).toBeVisible();
  await navbar.gamesLink.click();
  await expect(navbar.gamesActive).toBeVisible();
});
```

Rules: one assertion per step, no assertions in `beforeAll`/`afterAll` (setup and teardown only),
and an assertion on something visible after every navigation between Vortex pages.

### Locator priority

1. `getByRole()` — accessibility attributes.
2. `getByText()` — visible text; the most common choice in Vortex POMs, because the React UI has few
   stable test ids.
3. `getByLabel()` — form control by label.
4. `getByPlaceholder()` — input placeholder.
5. `getByTitle()` — used heavily by the sidebar.
6. `getByTestId()` — only where the component actually exposes `data-testid`.

Avoid CSS class selectors, `nth-of-type`, and anything else that moves on a refactor. When text
matches several elements, narrow with `.first()`, `.filter()`, or a `hasText` constraint rather than
reaching for CSS.

### Timeouts

Every explicit timeout comes from `helpers/timeouts.ts`. The `Timeouts` values double under CI.

| Constant | Value (local) | Use |
| --- | --- | --- |
| `GlobalTimeouts.GLOBAL` | 10 min (45 on CI) | Whole run |
| `GlobalTimeouts.EXPECT` | 5 s | Default for web-first assertions |
| `GlobalTimeouts.ACTION` | 5 s | Default for `click`, `fill`, `hover` |
| `GlobalTimeouts.NAVIGATION` | 5 s | Default for navigation |
| `Timeouts.NETWORK` | 30 s | Assertions that wait on a network round-trip |
| `Timeouts.MODAL` | 10 s | Bounded wait for a client-rendered modal |
| `Timeouts.LIFECYCLE` | 3 min | Cold start, fixture setup, per-test timeout |
| `Timeouts.SNAPSHOT` | 5 min | Auth snapshot build (cold start + OAuth) |

Pure UI waits take no explicit timeout at all — the config defaults cover them, and a UI wait that
"needs" longer is usually racing something the test should await explicitly. Network-backed waits
pass `{ timeout: Timeouts.NETWORK }`. Never hardcode a `30_000` literal, never call
`test.setTimeout()` in a spec, and write best-effort probes as
`await locator.isVisible().catch(() => false)` with no timeout.

### Traps specific to this suite

**Never `waitForTimeout()`.** Wait on the condition instead.

| Instead of | Use |
| --- | --- |
| `waitForTimeout(X)` then click | `await expect(element).toBeVisible()` then click |
| `waitForTimeout(X)` for a modal | `await expect(modal).toBeVisible()` |
| `waitForTimeout(X)` for a spinner | `await expect(spinner).not.toBeVisible()` |
| `waitForTimeout(X)` for a toggle | `await expect(toggle).toHaveAttribute("aria-checked", "true")` |

**No string predicates.** The renderer ships a strict CSP (`script-src 'self' '<sha256...>'`, no
`'unsafe-eval'`), and Playwright evaluates string predicates through `eval`, which the CSP rejects.
This applies to `waitForFunction`, `page.evaluate`, `locator.evaluate`, and `evaluateHandle`.

```ts
// BAD - string predicate, blocked at runtime
await vortexWindow.waitForFunction("document.body?.innerText?.length > 0");

// GOOD - function predicate
await vortexWindow.waitForFunction(() => (document.body?.innerText?.length ?? 0) > 0);

// BETTER - locator-based, no DOM types needed
await expect(vortexWindow.locator("body")).not.toHaveText("");
```

**No URL assertions.** Vortex routes internally, so `expect(page).toHaveURL(...)` is meaningless.
Assert on visible state — a heading, an active sidebar item, a mounted panel.

**No DOM lib in the E2E tsconfig.** In-page APIs used inside an `evaluate` callback have to be typed
structurally; `settings.spec.ts` has a worked example that hit-tests a menu's corners through
`elementFromPoint`.

**Console listeners leak.** The smoke spec already watches the renderer console for unexpected
startup errors — prefer relying on it. A per-test listener must be attached before the action and
detached in `afterEach`, or it flakes every later test on that worker.

### Writing a spec against the live app

`helpers/inspect.ts` exports `llmBreakpoint(page, label)`, a no-op unless `VORTEX_E2E_INSPECT` is
set, so calls are safe to leave in a spec while iterating. Under the inspector run
(`pnpm -F @vortex/e2e run dev`) the fixture launches Electron with `--remote-debugging-port=9222`,
which is also why that run is pinned to `--workers=1` — only one process can own the port.

At a breakpoint the test writes a sentinel file (`vortex-e2e-pause` in the OS temp dir, containing
the label) and blocks with no timeout. Attach a CDP client to `127.0.0.1:9222`, inspect the live
window to find the right locators, then step forward by evaluating:

```js
window.__e2e.resume = true;
```

On resume the sentinel is deleted, re-arming it for the next breakpoint. `VORTEX_E2E_GREP` is read
by `playwright.config.ts` as the grep pattern, so the inspector run can be pointed at a single test:

```bash
VORTEX_E2E_GREP="<test name>" pnpm -F @vortex/e2e run dev
```

Two things to get right when scripting the wait: the test can fail *before* reaching the breakpoint,
so poll for the sentinel file **or** runner exit, never the sentinel alone; and strip every
`llmBreakpoint` call before committing, then re-run the spec headless to confirm it still passes.

The repo packages this whole loop as its `e2e-test` skill.

---

## What CI actually runs

`main.yml` — pushes and PRs to `master` and `release/*`, on `ubuntu-latest` and `windows-latest`:
`pnpm run build` then `pnpm run test`. This is the gate a normal PR has to clear. It is skipped
entirely for changes confined to the `paths-ignore` list (`**.md`, `docs/`, `locales/`, packaging
and Nix files).

`e2e.yml` — self-hosted runners (`vortex-e2e`, `platform-cluster`), and it only triggers on a PR when
that PR touches `packages/e2e/**` or the workflow file itself. Otherwise it runs on a schedule
(14:15, Monday through Thursday) or by manual dispatch. Both the job and the test steps set
`continue-on-error: true`, so a failing E2E run does not block anything; the one hard failure is a
missing `playwright-report` directory, which is the signature of the build dying before Playwright
ever started. Linux runs under `xvfb-run`.

`game-extension-test.yml` — nightly at 06:00 plus manual dispatch, exercising opted-in bundled game
extensions through the `@vortex/game-extension-test` harness. Not a PR gate either.

The practical consequence: **the E2E suite is not a PR gate, so a UI change is only verified by
running it locally.** Treat a green PR check as evidence about units and integration only.

---

## Stale claims in the repo's own docs

| Claim | Where | Reality |
| --- | --- | --- |
| Electron launches once per worker; tests in a file share the instance | `packages/e2e/README.md` | `vortexApp` and `vortexWindow` are test-scoped — one process per test. Only the auth snapshot cache is worker-scoped |
| Screenshots on failure, video and trace on first retry | `packages/e2e/README.md` | `playwright.config.ts` sets all three to `"off"`; the fixtures attach their own diagnostics |
| `pnpm nx run @vortex/e2e:dev:isolated` | `E2E-BEST-PRACTICES.md` | The target is `dev:explore` |
| `pnpm nx run @vortex/e2e:ui` | `E2E-BEST-PRACTICES.md` | The script is `e2e:ui` |
| `pnpm e2e:debug`, `pnpm e2e:report` | root `package.json`, `packages/e2e/README.md` | Those nx targets do not exist; use `run e2e:ui` and `exec playwright show-report` |
| Windows E2E is required and blocks PRs on failure | `packages/e2e/README.md` | `e2e.yml` is `continue-on-error: true` throughout, and does not run at all on PRs that leave `packages/e2e/**` untouched |
| Fixtures at `packages/e2e/fixtures/`, selectors at `packages/e2e/selectors/` | `packages/e2e/README.md` | Everything moved under `packages/e2e/src/` |

---

## See also

`VORTEX_DEV_BUILD.md` (getting the repo to the point where these commands run, and the
build/lint/typecheck half of verifying a change) · `VORTEX_CODESTYLE.md` (the conventions test code
is held to, and the lint rules that enforce them) · `VORTEX_AGENT_GUIDES.md` (the repo's own
`AGENTS*.md` files and packaged skills, including the E2E authoring skill) · `VORTEX_APP.md` (repo
layout, the process split the E2E fixture launches, and the internal package list) ·
`VORTEX_DATABASES.md` (the DuckDB state the auth snapshot has to flush before it can be copied).
