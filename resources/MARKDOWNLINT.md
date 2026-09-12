# markdownlint (Doc Linter)

`markdownlint-cli2` lints every Markdown file in this repo. It exists because `oxfmt` (see
`OXFMT.md`) deliberately excludes `**/*.md` — this is what actually enforces Markdown formatting.

---

## Config

Root-level `.markdownlint-cli2.jsonc`:

```jsonc
{
  "config": {
    "default": true,
    "MD013": false,
    "MD060": { "style": "consistent" }
  },
  "ignores": ["node_modules/**", "CC-Session-Logs/**", "graphify-out/**"]
}
```

- `default: true` turns on the full standard rule set — this repo's Markdown already matched
  almost all of it (blank lines around headings/lists/fences/tables, unique headings, a real `#`
  title, no bare fenced blocks, no hard tabs, backtick type expressions instead of bare `<...>`).
- `MD013` (line length) is off — both hand-written docs and generated per-extension changelogs
  run long single lines by design.
- `MD060` (table column style) is set to `consistent` rather than the default `aligned` — this
  repo's tables use spaced `| --- |` separators but are not visually column-aligned, and forcing
  alignment would rewrite nearly every table in the repo for no functional gain.
- `ignores` excludes `node_modules`, plus two generated/historical folders that are gitignored and
  were never meant to be linted: `CC-Session-Logs/` (session history) and `graphify-out/` (a
  regenerable knowledge-graph report).

## Commands

```text
npm run lint:md          # markdownlint-cli2 "**/*.md" -- report only
npm run lint:md:fix      # same, with --fix -- rewrites what's auto-fixable
```

Most spacing/blank-line rules are auto-fixable. Rules like duplicate headings or inline HTML are
not — those need a manual look at the file.

## Editor integration

VS Code lints Markdown live through the `davidanson.vscode-markdownlint` extension, which reads
`.markdownlint-cli2.jsonc` automatically — no extra editor settings needed.

## See also

`OXFMT.md` (the formatter that excludes Markdown, making this the enforcement layer for it) ·
`BOOTSTRAP.md` (installs the Node dev dependencies this doc assumes).
