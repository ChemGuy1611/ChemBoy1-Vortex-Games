# Vortex Code Style

The conventions the Vortex application repo is written to, and which of them are enforced by
tooling rather than convention. Useful when contributing a pull request upstream — reviewers will
expect new code to match these. The repo's own sources are `CODESTYLE.md` (the written standard),
`AGENTS-FRONTEND.md` (renderer-specific), and the lint/format configs listed at the end.

Where the written standard and the tooling disagree, the tooling wins — see "Where the written
standard has drifted".

---

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Interface | `I` prefix, PascalCase | `IBaseProps`, `IMainPageOptions` |
| Type alias / union | PascalCase, no prefix | `Severity`, `NotificationFunc` |
| Enum + enum values | PascalCase | `enum Decision { … }` |
| React component | PascalCase | `<TestComponent />` |
| Function | camelCase | `fetchReduxState()` |
| Local variable, property | camelCase | `visibleLineCount` |
| Exported / global constant | UPPER_SNAKE_CASE | `NEXUS_MEMBERSHIP_URL` |
| **Private class property** | **`m` prefix** | `private mWindow: BrowserWindow` |

The `m` prefix stands for "member". It is the repo's substitute for the more common `_` prefix, and
comes from the same C# heritage as the `I` on interfaces. It applies to private instance fields
only — not locals, not parameters, not methods.

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

- **React 16.14.** Function components and hooks only. React 18+ APIs (`useId`,
  `useSyncExternalStore`, `useTransition`, `createRoot`, automatic batching guarantees) are not
  available. New class components draw a lint warning; the many existing ones stay as they are.
- Typed props interface per component, one component per file, named exports.
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
- Icons: MDI paths from `@mdi/js` via `getIconPath`. Custom SVGs use a 24x24 viewBox, single filled
  path with `fill="currentColor"`.
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
gives are things like changing the mod staging folder or the downloads directory. Renderer tests
use vitest with `@testing-library/react` v12, colocated as `<Name>.test.tsx`, querying by
role/label/text rather than test ids.

---

## The enforcement layer

| Tool | Config | What it decides |
| --- | --- | --- |
| `oxfmt` | `.oxfmtrc.json` | All formatting: line wrapping, quotes, import grouping and order, Tailwind class order |
| `oxlint` | `oxlint.base.config.json` | Fast pass; `correctness` + `suspicious` are errors, `perf` warns; type-aware |
| ESLint | `eslint.config.base.mjs` + per-project `eslint.config.mjs` | Type-checked rules, React rules, perfectionist sorting, and the custom `vortex/*` rules in `eslint-rules/` |
| `.editorconfig` | — | LF endings, UTF-8, final newline; 2-space indent for JS/TS/JSON/YAML, 4 elsewhere |

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
`AGENTS-FRONTEND.md` is the current word for renderer code.

---

## See also

`VORTEX_DEV_BUILD.md` (how to run the formatter, linter, and type checker) · `VORTEX_AGENT_GUIDES.md`
(the repo's own instruction files, which these conventions are drawn from) · `VORTEX_APP.md` (repo
layout and where each toolchain config lives) · `VORTEX_2_MIGRATION.md` (API-level changes for
extension authors).
