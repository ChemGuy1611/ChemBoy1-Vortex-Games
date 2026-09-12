# oxfmt (Code Formatter)

`oxfmt` is the code formatter used in this repo for JavaScript and JSON. It replaced Prettier.

---

## What it is

`oxfmt` is part of the [oxc](https://oxc.rs/) toolchain — the same Rust-based project behind the
`oxlint` linter — distributed as an npm package. It formats JavaScript, JSX, and JSON, deciding
line wrapping, quote style, and import ordering: everything Prettier used to own, plus import
sorting, which Prettier never did on its own.

---

## Config in this repo

Root-level `.oxfmtrc.json`:

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "sortPackageJson": false,
  "embeddedLanguageFormatting": "auto",
  "ignorePatterns": [
    "**/node_modules/**",
    "package-lock.json",
    "resources/snippets.js",
    "resources/extensions-manifest.json",
    "resources/*.d.ts",
    "**/*.min.js",
    "**/*.zip",
    "**/*.md"
  ]
}
```

- `sortPackageJson: false` — leaves `package.json` key order alone.
- `ignorePatterns` skips generated files (`resources/snippets.js`, `resources/extensions-manifest.json`),
  bare `.d.ts` declarations `oxfmt` can't parse, minified/zip files, and all Markdown.

### Why Markdown is excluded

`oxfmt` 0.57 mangles bare-prose Markdown: it treats the underscores in a `SNAKE_CASE` identifier
and the underscores used for emphasis as the same token and escapes them (`OLD_VERSION` becomes
`OLD\*VERSION`, `_uploaded_` becomes `\_uploaded\_`). Doc formatting in this repo is governed by
markdownlint instead.

### Defaults worth knowing

| Setting            | Value       | Note                                                                                |
| ------------------ | ----------- | ------------------------------------------------------------------------------------ |
| Print width        | 100         | Prettier's default is 80 — an 80-column reflow is a sign a file went through the wrong formatter |
| Quote style        | Double      |                                                                                      |
| Quote object keys  | `as-needed` | Strips quotes from keys that don't need them                                       |
| Indent             | 2 spaces    | From `.editorconfig` for `*.{js,...}`                                              |
| Object wrapping    | `preserve`  | Keeps an object's original single-line/multi-line shape rather than forcing one     |

---

## Commands

```text
npm run format          # oxfmt --write . -- rewrite the whole tree
npm run format:check    # oxfmt --check . -- report without writing
```

---

## Editor integration

VS Code formats through the `oxc.oxc-vscode` extension rather than a Prettier extension:

```jsonc
{
  "oxc.fmt.configPath": ".oxfmtrc.json",
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.formatOnSave": true
}
```

The `oxc.oxc-vscode` extension needs an `oxfmt` binary present in the repo's own `node_modules` to
activate — run `npm install` first.

---

## History

`oxfmt` replaced Prettier repo-wide. The old `prettier.config.mjs` (an empty defaults object) and
the `prettier` / `prettier-eslint` dev dependencies are gone; `oxfmt` (`^0.57.0`) is the sole
formatter dev dependency now.

---

## Same setup, other repos

The same minimal formatter setup — a `package.json` with `format`/`format:check` scripts, a
`.oxfmtrc.json`, and a `.vscode/settings.json` pointing at the `oxc.oxc-vscode` extension, with no
runtime dependencies — is used in the `Personal` repo, with its own `ignorePatterns` tuned to what
that repo actually contains (`_Mods/**`, `Windows Registry Tweaks/**`, `resources/**`,
`__pycache__/**`, plus `*.zip`/`*.log`/`*.csv`). That repo is mostly Python, so `oxfmt` there only
ever touches a handful of first-party JS/JSON files.

The Vortex application itself (`Nexus-Mods/Vortex`) also formats with `oxfmt`, as part of a
heavier enforcement stack that additionally sorts Tailwind classes and runs on every commit via
Husky/lint-staged — see `VORTEX_CODESTYLE.md` and `VORTEX_DEV_BUILD.md` for that repo's full
toolchain.

---

## See also

`MARKDOWNLINT.md` (the doc linter that covers the `**/*.md` files this formatter excludes) ·
`BOOTSTRAP.md` (installs the Node dev dependencies this doc assumes) · `VORTEX_CODESTYLE.md` (the
Vortex app repo's own, heavier oxfmt/oxlint/ESLint stack) · `VORTEX_DEV_BUILD.md` (running the
formatter as part of building Vortex from source).
