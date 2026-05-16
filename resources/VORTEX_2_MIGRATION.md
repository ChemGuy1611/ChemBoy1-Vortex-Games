# Vortex 2.0 Migration Guide

Changes extension developers need to make when targeting Vortex 2.0. The API surface is largely unchanged — the migration is primarily build tooling and dependency management.

Source: `vortex-api/docs/MIGRATION.md`

---

## Summary of breaking changes

| Area | 1.16 | 2.0 |
| --- | --- | --- |
| Runtime devDependencies | Manually listed | Provided by `vortex-api` peerDependencies |
| Dev plugins folder | `%APPDATA%/vortex_devel/plugins` | `%APPDATA%/@vortex/main/plugins` |
| `VORTEX_VERSION` constant | `@vortex/shared` export | Removed — use `state.app.appVersion` |
| Main page priority — Load Order | (varied) | `30` |
| Main page priority — Save Games | (varied) | `50` |
| Page name casing | Title Case | Sentence case |
| Bundler | webpack only | webpack or Rolldown |

---

## Step 1 — Remove registry devDependencies

Most runtime packages are now declared as `peerDependencies` of `vortex-api` and installed automatically by pnpm/npm 7+/Yarn Berry. Remove them from `devDependencies`:

```diff
- "@types/bluebird": "3.5.20",
- "@types/lodash": "^4.14.149",
- "@types/react": "16.14.66",
- "@types/react-redux": "^7.1.9",
- "bluebird": "^3.7.2",
- "i18next": "^19.0.1",
- "react": "^16.12.0",
- "react-bootstrap": "^0.33.0",
- "react-dom": "^16.12.0",
- "react-i18next": "^11.11.0",
- "react-redux": "^7.1.3",
- "redux": "^4.0.4",
- "redux-act": "^1.7.7",
```

Keep: build tools (TypeScript, webpack/rolldown, eslint), your extension's own runtime deps, and git-based packages (see below).

### Git-based packages (manual — keep with commit hash)

These are not on npm so they cannot be in peerDependencies. Add only the ones your extension imports:

```json
"@nexusmods/nexus-api": "git+https://github.com/Nexus-Mods/node-nexus-api#4192c0c9...",
"modmeta-db": "git+https://github.com/Nexus-Mods/modmeta-db#daa8935b...",
"turbowalk": "git+https://github.com/Nexus-Mods/node-turbowalk#3502f6ff...",
"vortex-parse-ini": "git+https://github.com/Nexus-Mods/vortex-parse-ini#2425af99...",
"winapi-bindings": "git+https://github.com/Nexus-Mods/node-winapi-bindings#faa92afe..."
```

Commit hashes must match what Vortex ships. Authoritative source: `Vortex/pnpm-workspace.yaml` (catalog section).

---

## Step 2 — Replace VORTEX_VERSION

```diff
- import { VORTEX_VERSION } from '@vortex/shared';
- const version = VORTEX_VERSION;
+ const version = context.api.getState().app.appVersion;
```

---

## Step 3 — Update main page priorities

```diff
  context.registerMainPage('sort-none', 'Load order', MyLoadOrderPage, {
-   priority: 50,
+   priority: 30,
    id: 'my-loadorder',
    group: 'per-game',
  });

  context.registerMainPage('savegame', 'Save games', MySavegamePage, {
-   priority: 100,
+   priority: 50,
    id: 'my-savegames',
    group: 'per-game',
  });
```

Use **sentence case** for page names: `'Load order'` not `'Load Order'`.

---

## Step 4 — Update dev deployment path (dev build only)

Only relevant if your build scripts copy to Vortex's dev plugins folder:

```diff
- const devPlugins = '%APPDATA%/vortex_devel/plugins';
+ const devPlugins = '%APPDATA%/@vortex/main/plugins';
```

Production path (`%APPDATA%/Vortex/plugins`) is unchanged.

---

## Step 5 — Webpack externals simplification (optional)

If using a custom webpack config:

```js
const { peerDependencies } = require('vortex-api/package.json');
module.exports = {
  externals: [
    ...Object.keys(peerDependencies || {}),
    'electron', 'vortex-api',
  ].reduce((acc, dep) => { acc[dep] = `commonjs ${dep}`; return acc; }, {}),
};
```

---

## Collections types

`collections` extension types (`ICollection`, `IExtensionFeature`, etc.) are not yet in the `vortex-api` bundle. Add local type declarations if needed; otherwise wait for a future `vortex-api` release.

---

## Quick checklist

- [ ] Remove registry packages from `devDependencies`
- [ ] Keep git-based packages with commit hashes from `Vortex/pnpm-workspace.yaml`
- [ ] Replace `VORTEX_VERSION` with `state.app.appVersion`
- [ ] Update Load Order page priority to `30`, Save Games to `50`
- [ ] Use sentence case for page names
- [ ] Update dev plugins path if using dev builds
