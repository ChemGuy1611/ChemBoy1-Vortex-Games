# Vortex Event Bus (runtime glue)

How Vortex's loosely-coupled features actually talk to each other at runtime — the **mechanism**,
not the catalog. For the list of concrete events and their argument signatures, see `EVENTS.md`
and memory `reference_vortex_events` (the catalog); this doc is the plumbing underneath them.

Implementation: `Vortex/src/renderer/src/ExtensionManager.ts` (the `api.events` emitter plus
`emitAndAwait` / `onAsync`).

## Three mechanisms

### 1. Synchronous events — `api.events` (a Node `EventEmitter`)

`api.events` **is** the raw `EventEmitter` (`mEventEmitter`, `setMaxListeners(100)`):

```ts
api.events.on('event-name', (args) => { /* fire and forget */ });
api.events.emit('event-name', args);
```

No back-pressure: the emitter doesn't wait for listeners. Used for notifications like
`mods-did-deploy`, `gamemode-activated`.

### 2. Async events — `api.emitAndAwait` / `api.onAsync`

When the emitter must **wait for all handlers** (and optionally collect their results), Vortex
appends an `enqueue` callback as the **last argument** of the emit:

```ts
api.onAsync('event-name', async (args) => { ...; return maybeResult; });
const results = await api.emitAndAwait('event-name', args);
```

Mechanism (`emitAndAwait`):

- It builds a serial `queue` (`PromiseBB.resolve()`) and a `results[]` array, then emits the event
  with `enqueue` appended: `mEventEmitter.emit(event, ...args, enqueue)`.
- Each `onAsync` handler **pops the last arg** (the `enqueue` fn) and calls
  `enqueue(handler(...args))`. `enqueue` chains the returned promise onto `queue`; a non-`null`/
  non-`undefined` resolved value is pushed to `results`.
- A handler that throws does **not** reject the whole emit — it surfaces as
  `showErrorNotification("Unhandled error in event ...")` and the queue continues.
- `emitAndAwait` returns `queue.then(() => results)` — all handlers done, results gathered.

If something `emit`s an `emitAndAwait`-style event **without** the `enqueue` arg, `onAsync` detects
the missing function, shows an "Invalid event handler" notification, and calls the listener anyway.

### 3. Deferred registration — `context.once` / `onceMain`

Handlers are registered inside **`context.once(() => { ... })`**, which runs only **after all
extensions are loaded**, so cross-extension events are wired before anything fires. `onceMain` is
the main-process equivalent; in the renderer it is **deprecated** (logs a warning).

## The will-/did- pattern

Reversible operations bracket themselves with a pre- and post- event via `withPrePost(name, cb)`:

```text
emitAndAwait('will-<name>', ...args)  ->  cb(...args)  ->  emitAndAwait('did-<name>', result, ...args)
```

So `will-deploy` runs (handlers may adjust state), then the deploy happens, then `did-deploy` runs
with the result. The same shape appears for install, purge, etc. `will-*` handlers can mutate state
that the operation then re-reads (e.g. a `will-deploy` handler disabling a mod).

## Loose coupling — why it matters

Features don't import each other; they emit and listen. The mod pipeline doesn't know about load
order or Nexus — it just emits `did-install-mod`, and whoever cares listens. This is what lets
third-party extensions hook core flows without patching them.

## End-to-end happy path

```text
download-finished
  -> start-install -> InstallManager.install -> (extract + instructions) -> staged
  -> mod added to state; user enables -> mod-enabled / mods-enabled
  -> (debounced) will-deploy -> deployMods (activator) -> did-deploy / mods-did-deploy
gamemode-activated  -> validators / health checks, LO deserialize, plugin mgmt, redeploy check
profile-will-change -> (refresh + deploy prev + deploy current) -> profile-did-change
```

`gamemode-activated` is the widest fan-out: deployment validators, FBLO load, Gamebryo plugin
management, and health checks all hang off it.

## Gotchas

- Register handlers inside `context.once()` — registering at module top-level can miss events or
  race extension loading.
- `emit` (sync) vs `emitAndAwait` (async) are **not** interchangeable: an `onAsync` handler relies
  on the trailing `enqueue` arg, and a plain `emit` won't wait for it.
- Errors thrown in `emitAndAwait` handlers become notifications, **not** rejections — the emitter
  keeps going. Don't rely on a throwing handler to abort an operation.
- Max listeners is raised to 100; genuinely unbounded listener growth still leaks.

## See also

Catalog: `EVENTS.md`, memory `reference_vortex_events` (+ `_detail`). Runtime siblings that emit
these: `VORTEX_MOD_INSTALL.md`, `VORTEX_DEPLOYMENT.md`, `VORTEX_PROFILES.md`,
`VORTEX_GAME_LIFECYCLE.md`, `VORTEX_DOWNLOAD_MGMT.md`. Overview: `VORTEX_APP.md`. Memory:
`reference_vortex_event_bus`.
