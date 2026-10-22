# Vortex Code Style

The conventions the Vortex application repo is written to, and which of them are enforced by
tooling rather than convention. Useful when contributing a pull request upstream — reviewers will
expect new code to match these. The repo's own sources are `CODESTYLE.md` (the written standard),
`docs/frontend.md` (renderer-specific), `docs/state.md` (Redux), and the lint/format configs listed
at the end. The pull-request policy itself is in `VORTEX_CONTRIBUTING.md`.

Where the written standard and the tooling disagree, the tooling wins — see "Where the written
standard has drifted".

---

## Naming

| Kind                       | Convention             | Example                          |
| -------------------------- | ---------------------- | -------------------------------- |
| Interface                  | `I` prefix, PascalCase | `IBaseProps`, `IMainPageOptions` |
| Type alias / union         | PascalCase, no prefix  | `Severity`, `NotificationFunc`   |
| Enum + enum values         | PascalCase             | `enum Decision { … }`            |
| React component            | PascalCase             | `<TestComponent />`              |
| Function                   | camelCase              | `fetchReduxState()`              |
| Local variable, property   | camelCase              | `visibleLineCount`               |
| Exported / global constant | UPPER_SNAKE_CASE       | `NEXUS_MEMBERSHIP_URL`           |
| **Private class property** | **`#` private field**  | `#window: BrowserWindow`         |

Since September 2026 `CODESTYLE.md` prefers JavaScript private fields (`#name`) over the TypeScript
`private` modifier. Most existing classes still use the older convention — `private` plus an `m`
("member") prefix, as in `private mWindow`, about three times as common as `#` fields in `src/` —
so expect both when reading. New fields use `#`; inside an old class, follow the Boy Scout Rule
rather than adding one more `m` field.

File naming: a file that primarily contains a class, interface, or React component is named after
it in PascalCase (`ModList.tsx`, `Application.ts`); a file of free-standing functions uses
lowerCamelCase (`modUpdateState.ts`, `filterModInfo.ts`).

---

## Size and shape

- **Line length:** soft limit 100 characters, hard limit 150. The formatter reflows code to fit
  comfortably inside the soft limit, so let it wrap rather than hand-wrapping.
- **Function length:** soft limit of 25 lines. Long functions get split into smaller ones.
- **Boy Scout Rule:** when touching old code, bring it up to current standards rather than matching
  its age.

---

## Promises and async

Use `async`/`await` and ES promises. **Bluebird is being removed**, so avoid its extensions even
though plenty of existing code still uses them:

```ts
somethingAsync().catch(ExceptionType, (err) => { … });          // NO
somethingAsync().catch((err) => {                                // YES
  if (err instanceof ExceptionType) { … } else { return Promise.reject(err); }
});

Promise.map(stuff, (item) => somethingAsync(item));              // NO
Promise.all(stuff.map((item) => somethingAsync(item)));          // YES
for (const item of stuff) { await somethingAsync(item); }        // ALSO YES
```

This one is lint-backed: the repo ships custom ESLint rules `vortex/no-bluebird-promise-alias`
(error), `vortex/no-bluebird-resolve-promiselike` (warn), and a restricted-import warning on the
`bluebird` package itself.

---

## TypeScript

- `import type { … }` for type-only imports — `@typescript-eslint/consistent-type-imports` is an
  **error**, not a preference.
- `no-explicit-any` is disabled, which is not licence to use `any` freely; use it only where truly
  necessary.
- Unused variables and arguments are reported unless prefixed with `_` (applies to args, caught
  errors, and destructured array elements).
- Define a type in the file that consumes it; lift it into a shared module only once a second file
  needs it.

---

## Renderer (React) specifics

- **React 18.3.1 on the legacy `ReactDOM.render` root** (React 17-compatible behaviour). Function
  components and hooks only. Do not use `createRoot`, concurrent features or `StrictMode` — the
  `createRoot` switch is a separate, later release. Class components, legacy context and
  `findDOMNode` still work but are deprecated; new class components draw a lint warning.
- Typed props interface per component, one component per file, named exports. Shared UI lives at
  `src/renderer/src/ui/components/<snake_case>/<PascalCase>.tsx` with a colocated
  `<Name>.test.tsx` and `<Name>.demo.tsx`; feature UI under `extensions/<ext>/` (`components/`,
  `views/`, `hooks/`, `utils/`, `selectors.ts`).
- **Imports:** prefer the `@/` alias over relative paths. In a file that already has
  `import * as React from "react"`, keep using `React.*`; elsewhere import names directly
  (`import { useCallback, type ReactNode } from "react"`) and never add a new `import * as React`.
- **Prop order is auto-enforced** (`perfectionist/sort-jsx-props`): shorthand props first, then
  alphabetical, `on*` callbacks last. Don't hand-order — run the formatter/`--fix`.
- Self-closing tags for empty elements (lint-enforced).
- **Omit props whose value equals the component default** — a redundant assignment pins the call
  site to today's default and blocks future sweeping changes.
- Redux: `useSelector` with a stable, module-level selector; subscribe to the narrowest slice;
  never return a freshly-created object, array, or element from a selector (referential inequality
  re-renders on every dispatch); push hot subscriptions down into small leaf components.
- i18n: localize through `useTranslation`, keep translated strings **static** (interpolate with
  `{{ placeholders }}` and `replace`, never build the key by concatenation), and never derive
  identity, state, keys, or comparisons from a translated string.
- Styling: Tailwind v4 utility classes with design tokens (`bg-surface-*`, `text-neutral-*`,
  `bg-danger-strong`, …) rather than raw colours; build conditional class strings with
  `joinClasses`, which the linter understands; class order is auto-sorted.
- Text: one `Typography` styles a whole **block** — wrap a list or a run of paragraphs in a single
  `Typography` with plain elements inside, rather than one per item. Nest another only where the
  style changes; one that only changes colour takes `typographyType="inherit"`. Medium/semibold
  weights are `font-medium` / `font-semibold` on the body style. A trial lint rule,
  `vortex/typography-wraps-text`, warns on the per-item pattern.
- Scrims vs overlays: darkening a backdrop (game art, modal backdrop) uses `bg-scrim-*` with text in
  `text-on-scrim-*` (or `brand="neutral-on-scrim"`), because scrims never flip with the theme.
  Tinting a surface for state (hover, pressed, input fill) uses the `translucent-*` ramps, which do.
  Ordinary text tokens on a scrim disappear in the light theme.
- Motion: respect **Settings → Interface → Reduce motion** through the app-aware `reduce-motion:`
  Tailwind variant (never `motion-reduce:`/`motion-safe:`, which only see the OS setting). Reduced
  means instant: start transitions from their final state, drop delays, prefer `transition-*`
  without an explicit `duration-*`. In JavaScript use `useReduceMotion()` / `isReduceMotionActive()`.
  Spinners and progress that carry information keep moving.
- Icons: MDI paths from `@mdi/js` via `getIconPath`. Custom SVGs use a 24x24 viewBox, single filled
  path with `fill="currentColor"`; a Material Symbols path (`0 -960 960 960`) ports by scaling
  ×0.025 and offsetting Y by +960.
- Public API: changing exported types in `types/api.ts` means running `pnpm run api` and committing
  the regenerated `etc/vortex.api.md`, with a one-line TSDoc on each new export.
- Comments: prefer self-documenting names; comment the non-obvious **why**, not the **what**.

---

## Error messages and logging

Crash reports are grouped by message and stack. Any dynamic part of an error message — a path, a
URL, anything user- or system-specific — must be **inside quotes** so the grouper ignores it,
otherwise each occurrence files a fresh report:

```ts
throw new CustomError(`CustomName "${dynamicInformation}"`);
```

---

## Testing

No coverage target, but "off-path" and critical behaviours get tests — the examples the standard
gives are things like changing the mod staging folder or the downloads directory. Renderer tests use
vitest with `@testing-library/react`, colocated as `<Name>.test.tsx`, querying by role or by a
`data-testid` the component exposes. Not by text: the test setup has no i18n instance, so `t` returns
the raw translation key — text matching belongs in the E2E suite, which runs against real translations.

A change is expected to ship its own tests and to have run them before the pull request:
`pnpm run verify` (format, build with lint and typecheck, then the vitest layers), plus
`pnpm run e2e` when the change touches a UI flow, since CI does not run the E2E suite on a normal
PR. `VORTEX_TESTING.md` covers both layers, including the Playwright conventions in
`packages/e2e/E2E-BEST-PRACTICES.md`.

---

## The enforcement layer

| Tool            | Config                                                     | What it decides                                                                                            |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `oxfmt`         | `.oxfmtrc.json`                                            | All formatting: line wrapping, quotes, import grouping and order, Tailwind class order                     |
| `oxlint`        | `oxlint.base.config.json`                                  | Fast pass; `correctness` + `suspicious` are errors, `perf` warns; type-aware                               |
| ESLint          | `eslint.config.base.mjs` + per-project `eslint.config.mjs` | Type-checked rules, React rules, perfectionist sorting, and the custom `vortex/*` rules in `eslint-rules/` |
| `.editorconfig` | —                                                          | LF endings, UTF-8, final newline; 2-space indent for JS/TS/JSON/YAML, 4 elsewhere                          |

Commands: `pnpm run format` (or `pnpm oxfmt --check <paths>`), `pnpm run lint`, `pnpm run
lint:verbose` to see warnings that `--quiet` hides. Husky runs `oxfmt` on staged files at commit
time. See `VORTEX_DEV_BUILD.md` for running these per project.

---

## Where the written standard has drifted

`CODESTYLE.md` predates the current toolchain in two places worth knowing before you copy its
examples:

- It names the **airbnb guidelines** as the baseline. The actual configured baseline is
  `eslint:recommended` + `typescript-eslint` recommended-type-checked + `eslint-config-prettier`,
  plus perfectionist and the React plugins.
- Its **parameter-alignment example** shows arguments hand-aligned under the opening parenthesis
  with the return type on its own line. `oxfmt` reflows that away. Write it however you like and
  let the formatter decide.

Likewise, `CODESTYLE.md` is silent on React because it predates the function-component migration;
`docs/frontend.md` is the current word for renderer code. The renderer ESLint config still declares
React `version: "16"` in its `react-x` settings although the runtime is 18.3.1 — trust
`docs/frontend.md` for what is allowed.

---

## See also

`VORTEX_CONTRIBUTING.md` (PR policy, CI gates, and per-change-type rules for state, errors,
analytics, i18n and pages) · `VORTEX_DEV_BUILD.md` (how to run the formatter, linter, and type checker) · `OXFMT.md` (the
formatter itself — config, defaults, and the lighter setup this repo shares with the extension repo)
· `VORTEX_TESTING.md` (the test layers these conventions apply to, and what a PR has to ship) ·
`VORTEX_AGENT_GUIDES.md` (the repo's own instruction files, which these conventions are drawn from)
· `VORTEX_APP.md` (repo layout and where each toolchain config lives) · `VORTEX_2_MIGRATION.md`
(API-level changes for extension authors).
