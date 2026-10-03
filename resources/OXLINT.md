# oxlint (JavaScript Linter)

`oxlint` is the linter used in this repo for the extension `index.js` files and the scripts. It replaced ESLint.

---

## What it is

`oxlint` is part of the [oxc](https://oxc.rs/) toolchain, the same Rust-based project behind the
`oxfmt` formatter, distributed as an npm package. It implements the core ESLint rules natively, reads
`// eslint-disable` comments, and lints the whole repo in a few seconds. The Vortex extensions are
plain CommonJS, so only the core rules are enabled: no typescript, unicorn or oxc plugins.

---

## Config in this repo

Root-level `.oxlintrc.json`:

- `plugins: []` and `categories.correctness: "error"` — core ESLint correctness rules, errors by default.
- `env.node` plus `globals` for `DOMParser`, `XMLSerializer` and `window`, which extensions use inside
  Vortex's renderer.
- `ignorePatterns` skips the generated `resources/snippets.js`. `node_modules` and anything in
  `.gitignore` are skipped automatically.

### Rules worth knowing

| Rule                     | Level | Why                                                                                                   |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| `no-unused-vars`         | warn  | Unused stubs, toggles and constants in the extension templates are intentional, so this never fails   |
| `no-unsafe-finally`      | warn  | Pre-existing hits, kept visible                                                                       |
| `require-yield`          | warn  | Pre-existing hits, kept visible                                                                       |
| `no-unused-expressions`  | off   | Bare expression statements such as `cond && fn()` are common in the extensions                       |
| `no-useless-assignment`  | off   |                                                                                                       |
| `no-restricted-properties` | error | Blocks the `vortex-api` fs-wrapper members (`vfs.statSync`, `vfs.readFileAsync`, ...) that have a native `fs` replacement, plus the retired `fsExtra.unlinkSync` / `copyFileSync`. Each entry's message names the native call to use instead |

A run that reports thousands of `no-unused-vars` warnings still exits `0`: read the output, do not branch
on the exit status. Only errors (including parse errors) fail a file.

**`no-undef` is not reported by this config.** A reference to an identifier that is declared nowhere passes
`lint_extensions.js` with 0 errors (a carried-over code block with four undefined names did exactly that).
After copying or splicing code between files, also run
`npx oxlint -c .oxlintrc.json -D no-undef game-<id>/index.js`; the expected count is 0 (it is 0 for
`template-ue4-5` and the ported UE4-5 games). `node --check` does not catch these either, it only parses.

---

## Commands

| Command                                | What it does                                                          |
| -------------------------------------- | --------------------------------------------------------------------- |
| `npm run lint`                         | Lint the whole repo                                                   |
| `npm run lint:fix`                     | Lint and apply safe fixes                                             |
| `node lint_extensions.js [GAME_ID ...]` | Per-extension pass/fail report, writes `lint_results.txt`            |
| `python new_extension.py` / `release_extension.py` | Lint the extension's `index.js` as a step (`--skip-lint` to skip) |

---

## Windows notes

- `oxlint` does not expand glob arguments such as `game-*/index.js` itself, and `cmd.exe` does not
  either. Pass explicit paths or a directory. `lint_extensions.js` batches explicit paths to stay under
  the 8191-character `cmd.exe` limit.
- `--format unix` prints repo-relative `file:line:col` lines (the VS Code tasks use it).
  `--format stylish` prints `\\?\C:\...` extended-length paths, which editors can fail to resolve.
- `--format json` returns a flat `diagnostics` array (`filename`, `code`, `severity`, `message`,
  `labels[].span.line/column`). `lint_extensions.js` regroups it per file.

---

## VS Code

The `oxc.oxc-vscode` extension runs the same `.oxlintrc.json`. In `.vscode/settings.json`:

- `oxc.enable.oxlint: true`.
- `oxc.lint.customization` lowers `no-unused-vars`, `no-unsafe-finally` and `require-yield` to `info`
  so the intentional warnings show as a blue squiggle without the orange file indicator. The setting
  only affects the editor, not the command line.
- `editor.codeActionsOnSave` uses `source.fixAll.oxc` with `"explicit"`, so fixes run on a manual
  save only.

---

## History

`oxlint` replaced ESLint repo-wide. The old `eslint.config.js` and the `eslint`, `@eslint/js`, `globals`
and `@typescript-eslint/parser` dev dependencies are gone. Run against the same 290 extension and
template files, both linters reported identical counts for the three rules above.

---

## See also

`OXFMT.md` (the formatter from the same toolchain) · `MARKDOWNLINT.md` (the doc linter) ·
`NODE_FS.md` (the migration that the `no-restricted-properties` block guards) · `BOOTSTRAP.md` (installs
the Node dev dependencies) · `VORTEX_CODESTYLE.md` (the Vortex app repo's own lint stack).
