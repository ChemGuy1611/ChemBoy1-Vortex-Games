# Helper Extensions

A `helper-*` extension is a Vortex extension that does not call `context.registerGame()`. It runs alongside the normal game extensions and either assists one specific game or patches behavior across every game Vortex knows about, depending on the pattern used.

---

## Two shapes

### Single-game companion

Scoped to one `GAME_ID`, everything gated behind an `if (gameId !== GAME_ID) return;` check. Registration happens in `main(context)`:

```js
function main(context) {
  context.once(() => {
    context.api.events.on("gamemode-activated", (gameId) => setup(context.api, gameId));
  });

  context.registerModType(...);   // if the helper adds a mod type
  context.registerAction(...);    // if the helper adds toolbar buttons
  return true;
}
```

Per repo convention, `context.register*` calls stay in `main()`; event handlers (`api.events.on`, `api.onAsync`) go inside `context.once()`. Example: `helper-falloutlondon` (Fallout: London GOG setup, directory-link creation, INI writes).

### Global, runtime-scoped

No target game, no UI. Reaches every game Vortex knows about (including games from other authors' extensions) by mutating each game's own registered `IGame.details` object after the fact:

```js
function patchGame(gameId) {
  const game = util.getGame(gameId);
  if (!game) return;
  // game.details is the REAL registered object - mutations are visible
  // to every other extension that later reads it.
  if (!game.details) game.details = {};
  ...
}

function main(context) {
  context.once(() => {
    const known = context.api.getState().session.gameMode.known || [];
    known.forEach((g) => patchGame(g.id));
    context.api.events.on("gamemode-activated", (gameId) => patchGame(gameId));
  });
  return true;
}
```

Example: `helper-globalignorepatterns` (adds README/CHANGELOG/LICENSE glob patterns to every game's `ignoreConflicts`/`ignoreDeploy`, without needing per-game support).

---

## Why `util.getGame()` mutation works

`util.getGame(gameId)` returns a `Proxy` wrapping the real registered `IGame` object. The proxy's `get` trap only intercepts `getModPaths`, `modTypes`, and `getInstalledVersion` — every other property (including `.details`) passes straight through to the real target. No `set` trap is defined either, so `game.details.ignoreConflicts.push(...)` (or replacing `.details` outright) writes directly to the object every other extension reads. This is the only public mechanism for one extension to affect another's registered game data after the fact — there is no dedicated "add a global ignore pattern" API.

All game ids Vortex currently knows about (not just the active one) are available at `api.getState().session.gameMode.known`, an array of `{ id, ... }` entries, readable from any extension via `api.getState()`.

Caveat: `mod-dependency-manager`'s conflict blacklist caches its result per active game id and only recomputes on a game switch, while `mod_management`'s deploy blacklist re-reads `game.details.ignoreDeploy` fresh on every construction. Patch on startup (`context.once`) AND on every `gamemode-activated`, so the mutation always lands before either blacklist is built for a given game.

---

## Required files

Same set as any other extension: `index.js`, `info.json` (five fields: `id`, `name`, `author`, `version`, `description`; the `id` is the helper's folder id, e.g. `falloutlondon` for `helper-falloutlondon`), `CHANGELOG.md` (`# Changelog` → `## [x.x.x]` entries), an icon PNG, and a version-marker `.txt` file matching the current version.

## Deploying for local testing

`deploy_to_vortex.py <id>` resolves a helper id to its `helper-<id>` folder and deploys it like a game extension. It looks in the plugins folder for one named just `<id>` first (the name Vortex installs an extension with an `info.json` `id` into), then `helper-<id>`, then the older Vortex-installed name forms, and creates `<id>` when none exists. Run it with `--dry-run` first to see which folder it picked.

---

## See also

`REGISTER_GAME.md` (the `ignoreConflicts`/`ignoreDeploy` fields a global helper can patch)
